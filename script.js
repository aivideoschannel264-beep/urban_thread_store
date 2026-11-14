/* URBAN THREAD: storefront + admin logic (one file, used by index.html and admin.html) */
const CONFIG = {
const CONFIG = {
  SUPABASE_URL: 'https://afwikvilbmgmwjcwamzx.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_FIpEBKTrSW_j3XhTvNIHHQ_pdX8U3AV',
  WHATSAPP: '',
  CURRENCY: 'Rs',
  EMAIL: '',
  ADDRESS: '',
  CATEGORIES: ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Hoodies', 'Jackets', 'Traditional Wear'],
  STATUSES: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
  BUCKET: 'product-images'
};  
  
  
  CATEGORIES: ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Hoodies', 'Jackets', 'Traditional Wear'],
  STATUSES: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
  BUCKET: 'product-images'
};

const sb = (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => `${CONFIG.CURRENCY} ${Number(n || 0).toLocaleString('en-US')}`;
const LOGO = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M11 6v22a13 13 0 0 0 26 0V6" stroke="currentColor" stroke-width="5" stroke-linecap="square"/><path d="M3 41c9-7 15 5 22-1s14 3 20-3" stroke="#b9bdc4" stroke-width="1.6" stroke-dasharray="3 3"/></svg>';
let toastT;

function toast(msg, bad) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.className = '', 3200);
}

const shortId = id => String(id).slice(0, 8).toUpperCase();
const sizesOf = p => (p.sizes ? String(p.sizes).split(',').map(s => s.trim()).filter(Boolean) : ['S', 'M', 'L', 'XL', 'XXL']);
const imgBox = (p, tag) => `<div class="pimg">${tag ? `<span class="tag">${esc(tag)}</span>` : ''}<span class="ph">${LOGO}</span>${p.image_url ? `<img loading="lazy" src="${esc(p.image_url)}" alt="${esc(p.name)}" onerror="this.remove()">` : ''}</div>`;

document.addEventListener('DOMContentLoaded', () => {
  $$('[data-logo]').forEach(e => e.innerHTML = LOGO);
  if ($('#yr')) $('#yr').textContent = new Date().getFullYear();
});

/* ============================== STOREFRONT ============================== */
const store = {
  products: [], loaded: false, error: null, order: null,
  cart: (() => { try { return JSON.parse(localStorage.getItem('ut_cart')) || []; } catch { return []; } })()
};

const saveCart = () => {
  try { localStorage.setItem('ut_cart', JSON.stringify(store.cart)); } catch { }
  const n = store.cart.reduce((a, i) => a + i.qty, 0), c = $('#cartCount');
  if (c) { c.textContent = n; c.hidden = !n; }
};

const findP = id => store.products.find(p => String(p.id) === String(id));
const cartLines = () => store.cart.map(i => ({ ...i, p: findP(i.id) })).filter(l => l.p);
const cartTotal = () => cartLines().reduce((a, l) => a + Number(l.p.price) * l.qty, 0);

async function loadProducts() {
  if (!sb) { store.error = 'setup'; store.loaded = true; return; }
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error) { store.error = error.message; } else { store.products = data || []; store.error = null; }
  store.loaded = true;
}

const card = (p, tag) => `<a class="card" href="#/product/${encodeURIComponent(p.id)}">${imgBox(p, tag)}<h3>${esc(p.name)}</h3><div class="cc">${esc(p.category || '')}</div><div class="pr">${money(p.price)}</div></a>`;
const skeleton = n => `<div class="grid">${'<div class="skel"></div>'.repeat(n)}</div>`;
const emptyBox = (h, t, btn) => `<div class="empty"><h3>${h}</h3><p>${t}</p>${btn || ''}</div>`;

function stateBox() {
  if (store.error === 'setup') return emptyBox('Store not connected yet', 'Add your Supabase URL and anon key at the top of script.js.');
  if (store.error) return emptyBox('Products could not load', esc(store.error) + '. Check your connection and database policies.', '<button class="btn" data-act="reload">Try again</button>');
  return '';
}

const views = {
  home() {
    const nw = store.products.filter(p => p.is_new);
    const newList = (nw.length ? nw : store.products).slice(0, 4);
    const best = store.products.filter(p => p.is_best_seller).slice(0, 4);
    return `
    <section class="hero">
      <svg class="thread" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 330C150 250 260 380 440 310S720 170 900 250s230 60 320-40"/></svg>
      <div class="wrap">
        <h1>Cut for the city.</h1>
        <p>Premium men's fashion with a streetwear edge. Sharp cuts, heavy fabric, paid on delivery.</p>
        <div class="cta"><a class="btn light" href="#/shop">Shop the collection</a><a class="btn ghost" href="#/shop?cat=new">New arrivals</a></div>
      </div>
    </section>
    <section class="s"><div class="wrap"><div class="shead"><h2>Shop by category</h2></div>
      <div class="cats">${CONFIG.CATEGORIES.map(c => `<a class="cat" href="#/shop?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div></div></section>
    <section class="s alt"><div class="wrap"><div class="shead"><h2>New arrivals</h2><a href="#/shop">View all</a></div>
      ${!store.loaded ? skeleton(4) : stateBox() || (newList.length ? `<div class="grid">${newList.map(p => card(p, p.is_new ? 'New' : '')).join('')}</div>` : emptyBox('New pieces coming soon', 'Our first collection is being added.'))}</div></section>
    ${best.length ? `<section class="s"><div class="wrap"><div class="shead"><h2>Best sellers</h2></div><div class="grid">${best.map(p => card(p, 'Best seller')).join('')}</div></div></section>` : ''}`;
  },

  shop(q) {
    const cat = q.get('cat') || '', term = q.get('q') || '';
    const cats = ['new', ...new Set([...CONFIG.CATEGORIES, ...store.products.map(p => p.category).filter(Boolean)])];
    return `<div class="page"><div class="wrap"><h1>${cat && cat !== 'new' ? esc(cat) : cat === 'new' ? 'New arrivals' : 'All clothing'}</h1>
      <div class="filters">
        <a class="chip ${!cat ? 'on' : ''}" href="#/shop">All</a>
        ${cats.map(c => `<a class="chip ${cat === c ? 'on' : ''}" href="#/shop?cat=${encodeURIComponent(c)}">${c === 'new' ? 'New arrivals' : esc(c)}</a>`).join('')}
        <input class="field" id="shopQ" type="search" placeholder="Search by name" value="${esc(term)}" aria-label="Search products">
        <select class="field" id="shopSort" aria-label="Sort"><option value="">Newest</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option></select>
      </div><div id="shopGrid"></div></div></div>`;
  },

  product(id) {
    const p = findP(id);
    if (!store.loaded) return `<div class="page"><div class="wrap">${skeleton(1)}</div></div>`;
    if (!p) return `<div class="page"><div class="wrap">${stateBox() || emptyBox('Product not found', 'It may have been removed.', '<a class="btn" href="#/shop">Back to shop</a>')}</div></div>`;
    const sz = sizesOf(p);
    return `<div class="page"><div class="wrap">
      <div class="crumb"><a href="#/shop">Shop</a> / ${p.category ? `<a href="#/shop?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a> / ` : ''}${esc(p.name)}</div>
      <div class="pd">${imgBox(p, p.is_new ? 'New' : '')}
        <div><h1>${esc(p.name)}</h1><div class="big">${money(p.price)}</div>
          ${p.description ? `<p class="d">${esc(p.description)}</p>` : ''}
          <strong>Size</strong><div class="sizes" id="sizes">${sz.map(s => `<button class="sz" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
          <div class="row"><button class="btn" data-act="add" data-id="${esc(p.id)}">Add to cart</button><button class="btn ghost" data-act="buy" data-id="${esc(p.id)}">Buy now</button></div>
          <p class="note">Cash on Delivery available. Pay when your order arrives.</p></div></div></div></div>`;
  },  ex ? ex.qty = Math.min(20, ex.qty + 1) : store.cart.push({ id, size, qty: 1 });
  saveCart();
}

const selSize = () => $('#sizes .on')?.dataset.size;

async function placeOrder(e) {
  e.preventDefault();
  const f = e.target, err = $('#coErr'), btn = $('#coBtn');
  const name = f.name.value.trim(), phone = f.phone.value.trim(), address = f.address.value.trim();
  err.textContent = '';

  if (name.length < 2) return err.textContent = 'Enter your full name.';
  if (!/^[+\d][\d\s\-]{6,18}$/.test(phone)) return err.textContent = 'Enter a valid phone number.';
  if (address.length < 8) return err.textContent = 'Enter your full delivery address.';
  if (!sb) return err.textContent = 'Store is not connected to the database yet.';

  btn.disabled = true;
  btn.textContent = 'Placing order…';

  const items = cartLines().map(l => ({ product_id: l.id, size: l.size, qty: l.qty }));
  const { data, error } = await sb.rpc('place_order', {
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_items: items
  });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Place order';
    err.textContent = 'Order failed: ' + error.message + '. Please try again or contact us on WhatsApp.';
    return;
  }

  store.order = shortId(data);
  store.cart = [];
  saveCart();
  route();
}

function initStore() {
  saveCart();
  const wa = CONFIG.WHATSAPP;

  if (wa) {
    const w = $('#waFloat');
    w.href = `https://wa.me/${wa}?text=${encodeURIComponent('Hello URBAN THREAD, I have a question.')}`;
    w.hidden = false;
    $('#fWa').href = `https://wa.me/${wa}`;
  } else $('#fWa').remove();

  $('#burger').onclick = () => {
    const o = $('#nav').classList.toggle('open');
    $('#burger').setAttribute('aria-expanded', o);
  };

  $('#hsearch').onsubmit = e => {
    e.preventDefault();
    location.hash = '#/shop?q=' + encodeURIComponent(e.target.q.value.trim());
    e.target.reset();
  };

  addEventListener('hashchange', route);
  document.addEventListener('input', e => {
    if (e.target.id === 'shopQ') renderGrid();
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'shopSort') renderGrid();
  });

  document.addEventListener('submit', e => {
    if (e.target.id === 'coForm') placeOrder(e);

    if (e.target.id === 'msgForm') {
      e.preventDefault();
      if (!wa) return toast('WhatsApp number is not set up yet.', true);

      window.open(
        `https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm ${$('#mn').value.trim()}. ${$('#mm').value.trim()}`)}`,
        '_blank',
        'noopener'
      );
    }
  });

  document.addEventListener('click', e => {
    const s = e.target.closest('.sz');
    if (s) {
      $$('.sz').forEach(b => b.classList.remove('on'));
      s.classList.add('on');
      return;
    }

    const b = e.target.closest('[data-act]');
    if (!b) return;

    const { act, id, size } = b.dataset;
    const line = () => store.cart.find(i => String(i.id) === id && i.size === size);

    if (act === 'reload') {
      store.loaded = false;
      route();
      loadProducts().then(route);
    }

    if (act === 'add' || act === 'buy') {
      const sz = selSize();
      if (!sz) return toast('Please select a size.', true);
      addToCart(id, sz);
      act === 'buy' ? location.hash = '#/checkout' : toast('Added to cart');
    }

    if (act === 'inc') {
      const l = line();
      if (l) l.qty = Math.min(20, l.qty + 1);
      saveCart();
      route();
    }

    if (act === 'dec') {
      const l = line();
      if (l) l.qty = Math.max(1, l.qty - 1);
      saveCart();
      route();
    }

    if (act === 'rm') {
      store.cart = store.cart.filter(i => !(String(i.id) === id && i.size === size));
      saveCart();
      route();
    }
  });

  route();
  loadProducts().then(() => {
    saveCart();
    route();
  });
        /* ================================ ADMIN ================================= */
const adm = { products: [], orders: [], tab: 'products', edit: null };
const A = () => $('#adminApp');

const fmtDate = d => d ? new Date(d).toLocaleString('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
}) : '';

async function initAdmin() {
  if (!sb) {
    A().innerHTML = '<div class="login"><h1>Not connected</h1><p>Add your Supabase URL and anon key at the top of script.js.</p></div>';
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  session ? await adminHome() : loginView();
}

function loginView(msg = '') {
  A().innerHTML = `<form class="login f" id="loginForm">
    <h1>Admin login</h1>
    <p class="note">URBAN THREAD store management</p>

    <label for="le">Email</label>
    <input class="field" id="le" type="email" autocomplete="username" required>

    <label for="lp">Password</label>
    <input class="field" id="lp" type="password" autocomplete="current-password" required>

    <div class="err" id="le_err" role="alert">${esc(msg)}</div>
    <button class="btn" style="width:100%;margin-top:18px" id="lb">Sign in</button>
  </form>`;

  $('#loginForm').onsubmit = async e => {
    e.preventDefault();

    const b = $('#lb');
    b.disabled = true;
    b.textContent = 'Signing in…';

    const { error } = await sb.auth.signInWithPassword({
      email: $('#le').value.trim(),
      password: $('#lp').value
    });

    if (error) {
      loginView('Sign in failed: ' + error.message);
      return;
    }

    adminHome();
  };
}

async function adminHome() {
  // Check the currently signed-in user's UID against public.admins.
  const { data: { user }, error: userError } = await sb.auth.getUser();

  if (userError || !user) {
    loginView('Could not verify your login. Please sign in again.');
    return;
  }

  const { data: adminRow, error: adminError } = await sb
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    loginView('Admin permission check failed: ' + adminError.message);
    return;
  }

  if (!adminRow) {
    loginView('This login is not an admin. Signed-in UID: ' + user.id);
    return;
  }

  A().innerHTML = `<div class="wrap">
    <div class="shead">
      <h1 style="font-size:32px">Dashboard</h1>
      <button class="btn ghost sm" id="out">Sign out</button>
    </div>

    <div class="tabs">
      <button class="chip" data-tab="products">Products</button>
      <button class="chip" data-tab="orders">Orders</button>
    </div>

    <div id="tabBody"></div>
  </div>`;

  $('#out').onclick = async () => {
    await sb.auth.signOut();
    loginView();
  };

  $$('[data-tab]').forEach(b => {
    b.onclick = () => showTab(b.dataset.tab);
  });

  showTab(adm.tab);
}

async function showTab(t) {
  adm.tab = t;

  $$('[data-tab]').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === t);
  });

  $('#tabBody').innerHTML = '<p>Loading…</p>';

  t === 'products' ? await productsTab() : await ordersTab();
}

async function productsTab() {
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    $('#tabBody').innerHTML = `<div class="err">${esc(error.message)}</div>`;
    return;
  }

  adm.products = data || [];

  const p = adm.edit
    ? adm.products.find(x => String(x.id) === String(adm.edit)) || {}
    : {};

  $('#tabBody').innerHTML = `<div class="panel">
    <h2>${adm.edit ? 'Edit product' : 'Add new product'}</h2>

    <form class="f" id="pForm">
      <div class="fg">

        <div>
          <label>Name</label>
          <input class="field" name="name" required value="${esc(p.name)}">
        </div>

        <div>
          <label>Price (${CONFIG.CURRENCY})</label>
          <input class="field" name="price" type="number" min="0" step="1" required value="${esc(p.price)}">
        </div>

        <div>
          <label>Category</label>
          <select class="field" name="category">
            ${[...new Set([...CONFIG.CATEGORIES, p.category].filter(Boolean))]
              .map(c => `<option ${c === p.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label>Sizes (comma separated)</label>
          <input class="field" name="sizes" placeholder="S,M,L,XL,XXL" value="${esc(p.sizes || 'S,M,L,XL,XXL')}">
        </div>

        <div class="full">
          <label>Description</label>
          <textarea class="field" name="description" rows="3">${esc(p.description)}</textarea>
        </div>

        <div class="full">
          <label>Product image</label>
          <input class="field" name="image" type="file" accept="image/jpeg,image/png,image/webp">
          ${p.image_url ? `<img class="prev" src="${esc(p.image_url)}" alt="">` : ''}
        </div>

      </div>

      <div class="chk">
        <label><input type="checkbox" name="is_new" ${p.is_new ? 'checked' : ''}> New arrival</label>
        <label><input type="checkbox" name="is_best_seller" ${p.is_best_seller ? 'checked' : ''}> Best seller</label>
      </div>

      <div class="err" id="pErr" role="alert"></div>

      <div class="acts">
        <button class="btn" id="pBtn">${adm.edit ? 'Save changes' : 'Add product'}</button>
        ${adm.edit ? '<button type="button" class="btn ghost" id="pCancel">Cancel</button>' : ''}
      </div>
    </form>
  </div>

  <div class="panel">
    <h2>Products (${adm.products.length})</h2>

    ${adm.products.length
      ? adm.products.map(x => `<div class="arow">
          ${imgBox(x)}
          <div>
            <strong>${esc(x.name)}</strong><br>
            <small>${esc(x.category || '')} · ${money(x.price)}</small>
          </div>
          <div class="acts">
            <button class="btn sm ghost" data-edit="${esc(x.id)}">Edit</button>
            <button class="btn sm danger" data-del="${esc(x.id)}">Delete</button>
          </div>
        </div>`).join('')
      : '<p>No products yet. Add your first one above.</p>'}
  </div>`;

  $('#pForm').onsubmit = saveProduct;

  if ($('#pCancel')) {
    $('#pCancel').onclick = () => {
      adm.edit = null;
      productsTab();
    };
  }

  $$('[data-edit]').forEach(b => {
    b.onclick = () => {
      adm.edit = b.dataset.edit;
      productsTab().then(() => scrollTo(0, 0));
    };
  });

  $$('[data-del]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Delete this product permanently?')) return;

      const { error } = await sb
        .from('products')
        .delete()
        .eq('id', b.dataset.del);

      error
        ? toast('Delete failed: ' + error.message, true)
        : (toast('Product deleted'), productsTab());
    };
  });
}

async function saveProduct(e) {
  e.preventDefault();

  const f = e.target;
  const err = $('#pErr');
  const btn = $('#pBtn');

  err.textContent = '';

  const old = adm.edit
    ? adm.products.find(x => String(x.id) === String(adm.edit))
    : null;

  const row = {
    name: f.name.value.trim(),
    price: Number(f.price.value),
    category: f.category.value,
    sizes: f.sizes.value.trim() || null,
    description: f.description.value.trim() || null,
    is_new: f.is_new.checked,
    is_best_seller: f.is_best_seller.checked,
    image_url: old?.image_url || null
  };

  if (!row.name || !(row.price >= 0)) {
    return err.textContent = 'Enter a name and a valid price.';
  }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  const file = f.image.files[0];

  if (file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      btn.disabled = false;
      btn.textContent = 'Save';
      return err.textContent = 'Use a JPG, PNG or WebP image under 5 MB.';
    }

    const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]+/gi, '-').toLowerCase()}`;

    const up = await sb.storage
      .from(CONFIG.BUCKET)
      .upload(path, file, { contentType: file.type });

    if (up.error) {
      btn.disabled = false;
      btn.textContent = 'Save';
      return err.textContent = 'Image upload failed: ' + up.error.message;
    }

    row.image_url = sb.storage.from(CONFIG.BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = adm.edit
    ? await sb.from('products').update(row).eq('id', adm.edit)
    : await sb.from('products').insert(row);

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Save';
    return err.textContent = error.message;
  }

  toast(adm.edit ? 'Product updated' : 'Product added');
  adm.edit = null;
  productsTab();
}

async function ordersTab() {
  const { data: orders, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    $('#tabBody').innerHTML = `<div class="err">${esc(error.message)}</div>`;
    return;
  }

  adm.orders = orders || [];
  let items = [];

  if (adm.orders.length) {
    const r = await sb
      .from('order_items')
      .select('*')
      .in('order_id', adm.orders.map(o => o.id));

    items = r.data || [];
  }

  $('#tabBody').innerHTML = adm.orders.length
    ? adm.orders.map(o => {
        const its = items.filter(i => String(i.order_id) === String(o.id));

        return `<div class="order">
          <header>
            <div>
              <strong>Order ${shortId(o.id)}</strong><br>
              <small>${fmtDate(o.created_at)}</small>
            </div>
            <span class="badge ${esc(o.status)}">${esc(o.status || 'Pending')}</span>
          </header>

          <p>
            <strong>${esc(o.customer_name)}</strong> ·
            <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a><br>
            ${esc(o.address)}
          </p>

          <ul>
            ${its.map(i => `<li>${esc(i.product_name)} (${esc(i.size)}) × ${i.quantity} · ${money(i.price * i.quantity)}</li>`).join('')}
          </ul>

          <p>
            <strong>Total ${money(o.total)}</strong> ·
            ${esc(o.payment_method || 'Cash on Delivery')}
          </p>

          <label style="font-size:13px;font-weight:600">Status </label>
          <select class="st" data-oid="${esc(o.id)}">
            ${CONFIG.STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>`;
      }).join('')
    : '<div class="empty"><h3>No orders yet</h3><p>New customer orders will appear here.</p></div>';

  $$('.st').forEach(s => {
    s.onchange = async () => {
      const { error } = await sb
        .from('orders')
        .update({ status: s.value })
        .eq('id', s.dataset.oid);

      error
        ? toast('Update failed: ' + error.message, true)
        : (toast('Status updated'), ordersTab());
    };
  });
}

/* boot */
document.addEventListener('DOMContentLoaded', () => {
  const pg = document.body.dataset.page;

  if (pg === 'store') initStore();
  else if (pg === 'admin') initAdmin();
});                        }
