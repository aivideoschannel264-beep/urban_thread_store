-- URBAN THREAD: run once in Supabase > SQL Editor.
-- Safe to re-run. It only ADDS missing columns; it never drops tables or data.

-- 1. Make sure the columns the site uses exist (existing ones are kept)
alter table public.products
  add column if not exists name text,
  add column if not exists price numeric default 0,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists sizes text,
  add column if not exists is_new boolean default false,
  add column if not exists is_best_seller boolean default false,
  add column if not exists created_at timestamptz default now();

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists total numeric default 0,
  add column if not exists status text default 'Pending',
  add column if not exists payment_method text default 'Cash on Delivery',
  add column if not exists created_at timestamptz default now();

alter table public.order_items
  add column if not exists order_id uuid,   -- if your orders.id is a number, change this type to match
  add column if not exists product_name text,
  add column if not exists size text,
  add column if not exists quantity int default 1,
  add column if not exists price numeric default 0;

-- 2. Admin list (only people in this table can manage the store)
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;   -- no policies = nobody can read it directly

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 3. Row Level Security
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "ut_products_read"   on public.products;
drop policy if exists "ut_products_admin"  on public.products;
drop policy if exists "ut_orders_admin"    on public.orders;
drop policy if exists "ut_items_admin"     on public.order_items;

create policy "ut_products_read"  on public.products for select using (true);
create policy "ut_products_admin" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ut_orders_admin"   on public.orders      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ut_items_admin"    on public.order_items  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Customers never write to orders directly. They call place_order() below.
-- IMPORTANT: policies from earlier setups are still active (policies add up). In
-- Table Editor > Policies, delete any old one that lets "anon" insert/update/delete/select on orders or order_items.

-- 4. Secure checkout: prices are read from the products table, not trusted from the browser
create or replace function public.place_order(p_name text, p_phone text, p_address text, p_items jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_id public.orders.id%type; v_total numeric := 0; it jsonb; p public.products%rowtype; q int;
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(coalesce(p_phone,''))) < 7 or length(trim(coalesce(p_address,''))) < 8 then
    raise exception 'Please enter your name, phone and full address';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from public.products where id::text = it ->> 'product_id';
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    q := greatest(1, least(20, coalesce((it ->> 'qty')::int, 1)));
    v_total := v_total + p.price * q;
  end loop;

  insert into public.orders (customer_name, phone, address, total, status, payment_method)
  values (trim(p_name), trim(p_phone), trim(p_address), v_total, 'Pending', 'Cash on Delivery')
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from public.products where id::text = it ->> 'product_id';
    q := greatest(1, least(20, coalesce((it ->> 'qty')::int, 1)));
    insert into public.order_items (order_id, product_id, product_name, size, quantity, price)
    values (v_id, p.id, p.name, left(coalesce(it ->> 'size',''), 10), q, p.price);
  end loop;
  return v_id::text;
end $$;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

-- 5. Product image storage (public read, admin-only upload)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
drop policy if exists "ut_img_read"  on storage.objects;
drop policy if exists "ut_img_admin" on storage.objects;
create policy "ut_img_read"  on storage.objects for select using (bucket_id = 'product-images');
create policy "ut_img_admin" on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());

-- 6. Make yourself admin: first create your user in Authentication > Users, then run (with YOUR email):
-- insert into public.admins (email) values ('you@example.com');
