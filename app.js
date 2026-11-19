const K = { u: 'gk_users', p: 'gk_products', o: 'gk_orders', t: 'gk_transactions', sb: 'gk_session_buyer', sa: 'gk_session_admin' };
const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const $ = id => document.getElementById(id);
const e = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const msg = (t, c) => `<p class="${c}" role="alert">${e(t)}</p>`;
const ADMIN_CODE = 'KOPI-ADMIN';
// Buyer and admin keep SEPARATE sessions, so both can be open in different tabs at the same time.
const SK = r => r === 'admin' ? K.sa : K.sb;
const me = r => get(SK(r), null);
const ADMIN_PAGES = ['admin', 'adminLogin', 'adminSignup'];
async function hash(s) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gk:' + s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch { return 'x' + btoa(unescape(encodeURIComponent(s))); }
}
// Not logged in: buyer pages go to Sign up (Order now flow), admin pages go to the admin login.
function need(role) {
  if (me(role)) return true;
  location.href = role === 'admin' ? 'admin-login.html' : 'signup.html?from=order';
  return false;
}
function header() {
  const admin = ADMIN_PAGES.includes(document.body.dataset.page), r = admin ? 'admin' : 'buyer', u = me(r);
  document.querySelector('header').innerHTML = admin
    ? `<div class="wrap"><a class="logo" href="${u ? 'admin.html' : 'admin-login.html'}">Gunita <span>KOPI</span> Admin</a><nav aria-label="Admin">${u ? `<a href="admin.html">${e(u.name)}</a><a href="#" id="out">Log out</a>` : ''}<a href="index.html">Back to website</a></nav></div>`
    : `<div class="wrap"><a class="logo" href="index.html">Gunita <span>KOPI</span></a><nav aria-label="Main">${[['index', 'Home'], ['about', 'About Us'], ['services', 'Services'], ['menu', 'Menu'], ['gallery', 'Gallery'], ['contact', 'Contact Us']].map(([f, t]) => `<a href="${f}.html"${location.pathname.endsWith('/' + f + '.html') || (f === 'index' && location.pathname.endsWith('/')) ? ' aria-current=page' : ''}>${t}</a>`).join('')}${u ? `<a href="buyer.html">${e(u.name)}</a><a href="#" id="out">Log out</a>` : '<a href="login.html">Login</a><a href="signup.html">Sign up</a>'}</nav></div>`;
  if (!admin) { const f = document.querySelector('footer .wrap'); if (f) f.insertAdjacentHTML('beforeend', '<a href="admin-login.html">Staff login</a>'); }
  if ($('out')) $('out').onclick = ev => { ev.preventDefault(); localStorage.removeItem(SK(r)); location.href = admin ? 'admin-login.html' : 'index.html'; };
}
// Product photos: resized to max 600px and saved as a small JPEG data URL (fits in localStorage).
const readPhoto = file => new Promise((res, rej) => {
  if (!file || !file.type.startsWith('image/')) return rej(new Error('Please choose an image file (JPG, PNG, WEBP).'));
  const r = new FileReader();
  r.onerror = () => rej(new Error('Could not read the photo.'));
  r.onload = () => {
    const im = new Image();
    im.onerror = () => rej(new Error('Could not read the photo.'));
    im.onload = () => {
      const k = Math.min(1, 600 / Math.max(im.width, im.height)), c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
});
const save = (k, v) => { try { set(k, v); return true; } catch { return false; } };
const FULL = 'Storage is full. Try a smaller photo or remove other photos.';
const itemsTxt = o => o.items.map(i => `${i.qty} x ${e(i.name)}`).join(', ');

function signup() {
  if (me('buyer')) { location.href = 'buyer.html'; return; }
  const from = location.search.includes('from=order');
  app.innerHTML = `<div class="narrow"><h1>Sign up</h1><div id="m">${from ? msg('Create a buyer account to place your order.', 'status show') : ''}</div><form id="f" style="margin-top:24px"><label>Name<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Password (8+ characters)<input type="password" name="password" required minlength="8"></label><label>Confirm password<input type="password" name="confirm" required></label><button class="btn">Create account</button></form><p>Already have an account? <a href="login.html">Log in</a></p></div>`;
  $('f').onsubmit = async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData($('f'))), us = get(K.u, []), m = d.email.trim().toLowerCase();
    const er = d.password !== d.confirm ? 'Passwords do not match.' : us.some(x => x.email === m) ? 'That email is already registered.' : '';
    if (er) return $('m').innerHTML = msg(er, 'err');
    const u = { id: Date.now(), name: d.name.trim(), email: m, hash: await hash(d.password), role: 'customer' };
    set(K.u, [...us, u]);
    set(K.sb, { id: u.id, name: u.name, role: 'customer' });
    location.href = 'buyer.html'; // straight to ordering
  };
}

function login() {
  if (me('buyer')) { location.href = 'buyer.html'; return; }
  app.innerHTML = `<div class="narrow"><h1>Login</h1><div id="m"></div><form id="f" style="margin-top:24px"><label>Email<input type="email" name="email" required></label><label>Password<input type="password" name="password" required></label><button class="btn">Log in</button></form><p>No account yet? <a href="signup.html">Sign up</a></p></div>`;
  $('f').onsubmit = async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData($('f'))), h = await hash(d.password);
    const u = get(K.u, []).find(x => x.role === 'customer' && x.email === d.email.trim().toLowerCase() && x.hash === h);
    if (!u) return $('m').innerHTML = msg('Wrong email or password.', 'err');
    set(K.sb, { id: u.id, name: u.name, role: 'customer' });
    location.href = 'buyer.html';
  };
}

function adminLogin() {
  if (me('admin')) { location.href = 'admin.html'; return; }
  app.innerHTML = `<div class="narrow"><h1>Admin login</h1><div id="m">${location.search.includes('new=1') ? msg('Admin account created. You can log in now.', 'status show') : ''}</div><form id="f" style="margin-top:24px"><label>Email<input type="email" name="email" required></label><label>Password<input type="password" name="password" required></label><button class="btn">Log in</button></form><p>New staff? <a href="admin-signup.html">Register as admin</a></p></div>`;
  $('f').onsubmit = async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData($('f'))), h = await hash(d.password);
    const u = get(K.u, []).find(x => x.role === 'admin' && x.email === d.email.trim().toLowerCase() && x.hash === h);
    if (!u) return $('m').innerHTML = msg('Wrong email or password.', 'err');
    set(K.sa, { id: u.id, name: u.name, role: 'admin' });
    location.href = 'admin.html';
  };
}

function adminSignup() {
  if (me('admin')) { location.href = 'admin.html'; return; }
  app.innerHTML = `<div class="narrow"><h1>Admin sign up</h1><div id="m"></div><form id="f" style="margin-top:24px"><label>Name<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Password (8+ characters)<input type="password" name="password" required minlength="8"></label><label>Confirm password<input type="password" name="confirm" required></label><label>Admin code<input name="code" autocomplete="off" required></label><button class="btn">Create admin account</button></form><p>Already registered? <a href="admin-login.html">Admin login</a></p></div>`;
  $('f').onsubmit = async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData($('f'))), us = get(K.u, []), m = d.email.trim().toLowerCase();
    const er = d.password !== d.confirm ? 'Passwords do not match.' : us.some(x => x.email === m) ? 'That email is already registered.' : d.code !== ADMIN_CODE ? 'Wrong admin code.' : '';
    if (er) return $('m').innerHTML = msg(er, 'err');
    set(K.u, [...us, { id: Date.now(), name: d.name.trim(), email: m, hash: await hash(d.password), role: 'admin' }]);
    location.href = 'admin-login.html?new=1';
  };
}

function buyer() {
  if (!need('buyer')) return;
  const u = me('buyer');
  const draw = note => {
    const ps = get(K.p, []).filter(p => p.avail), os = get(K.o, []).filter(o => o.uid === u.id).reverse();
    const payCell = o => o.paid ? `Paid<br><small>${e(o.paidAt)}</small>` : o.status === 'cancelled' ? '&mdash;' : `<form class="inline" data-pay="${o.id}"><select name="method" aria-label="Payment method"><option>Cash</option><option>GCash</option><option>Card</option></select><button class="btn sm">Buy</button></form>`;
    app.innerHTML = `<h1>Hi, ${e(u.name)}</h1>${note || ''}<h2 style="margin-top:32px">Place an order</h2><form id="f"><div class="grid">${ps.map(p => `<article class="card">${p.img ? `<img class="pimg" src="${e(p.img)}" alt="${e(p.name)}">` : ''}<h3>${e(p.name)}</h3><p>${e(p.desc)}</p><div class="bar"><span class="price">₱${p.price}</span><label style="flex-direction:row;align-items:center;gap:8px">Qty <input type="number" name="${p.id}" min="0" max="20" value="0"></label></div></article>`).join('')}</div><label style="max-width:240px">Order type<select name="type"><option value="takeaway">Takeaway</option><option value="dine_in">Dine-in</option></select></label><div><button class="btn">Place order</button></div></form><h2 style="margin-top:48px">My orders</h2>${os.length ? `<div class="table-wrap"><table><tr><th>#</th><th>Items</th><th>Type</th><th>Total</th><th>Status</th><th>Date</th><th>Payment</th></tr>${os.map(o => `<tr><td>${o.id}</td><td>${itemsTxt(o)}</td><td>${o.type}</td><td>₱${o.total}</td><td>${o.status}</td><td>${e(o.at)}</td><td>${payCell(o)}</td></tr>`).join('')}</table></div>` : '<p>No orders yet.</p>'}`;
    app.querySelectorAll('[data-pay]').forEach(pf => pf.onsubmit = ev => {
      ev.preventDefault();
      const all = get(K.o, []), o = all.find(x => x.id == pf.dataset.pay);
      if (!o || o.uid !== u.id || o.paid || o.status === 'cancelled') return draw();
      const tx = get(K.t, []), at = new Date().toLocaleString();
      // Pressing Buy = payment done AND order completed (shows as "completed" in the admin dashboard right away).
      o.paid = true; o.paidAt = at; o.status = 'completed'; o.completedAt = at;
      tx.push({ id: tx.length + 1, oid: o.id, uid: u.id, items: o.items, total: o.total, method: pf.elements.method.value, at });
      set(K.o, all); set(K.t, tx);
      draw(msg(`Thank you! Order #${o.id} paid: ₱${o.total} via ${pf.elements.method.value}. Order completed.`, 'status show'));
    });
    $('f').onsubmit = ev => {
      ev.preventDefault();
      const d = new FormData($('f')), items = ps.map(p => ({ pid: p.id, name: p.name, price: p.price, qty: Math.min(Math.max(parseInt(d.get(p.id)) || 0, 0), 20) })).filter(i => i.qty);
      if (!items.length) return draw(msg('Choose at least one item.', 'err'));
      const all = get(K.o, []), total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const o = { id: all.length + 1, uid: u.id, items, type: d.get('type'), total, status: 'pending', paid: false, at: new Date().toLocaleString() };
      set(K.o, [...all, o]); draw(msg(`Order #${o.id} placed. Total ₱${total}. Choose a payment method and press Buy in My orders to complete it.`, 'status show'));
    };
  };
  draw();
}

function admin() {
  if (!need('admin')) return;
  const ST = ['pending', 'preparing', 'ready', 'completed', 'cancelled'], CATS = ['Hot Coffee', 'Iced', 'Pastries'];
  const draw = note => {
    const os = get(K.o, []), ps = get(K.p, []), us = get(K.u, []), tx = get(K.t, []);
    const live = new Set(os.filter(o => o.status !== 'cancelled').map(o => o.id)), sales = tx.filter(t => live.has(t.oid)).reduce((s, t) => s + t.total, 0);
    const buyerName = id => e((us.find(x => x.id === id) || { name: 'Guest' }).name);
    app.innerHTML = `<h1>Admin dashboard</h1>${note || ''}<div class="stats">${[['Orders', os.length], ['Pending', os.filter(o => o.status === 'pending').length], ['Completed', os.filter(o => o.status === 'completed').length], ['Sales', '₱' + sales], ['Buyers', us.filter(x => x.role === 'customer').length]].map(([a, b]) => `<div class="card"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div>
<h2>Orders</h2><div class="table-wrap"><table><tr><th>#</th><th>Buyer</th><th>Items</th><th>Total</th><th>Placed</th><th>Payment</th><th>Status</th></tr>${[...os].reverse().map(o => `<tr><td>${o.id}</td><td>${buyerName(o.uid)}</td><td>${itemsTxt(o)} (${o.type})</td><td>₱${o.total}</td><td>${e(o.at)}</td><td>${o.paid ? 'Paid' : 'Unpaid'}</td><td><select data-o="${o.id}" aria-label="Status">${ST.map(s => `<option${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
<h2 style="margin-top:48px">Transactions</h2>${tx.length ? `<div class="table-wrap"><table><tr><th>Txn #</th><th>Order</th><th>Buyer</th><th>Bought</th><th>Amount</th><th>Method</th><th>Date &amp; time</th></tr>${[...tx].reverse().map(t => `<tr><td>${t.id}</td><td>#${t.oid}</td><td>${buyerName(t.uid)}</td><td>${itemsTxt(t)}</td><td>₱${t.total}</td><td>${e(t.method)}</td><td>${e(t.at)}</td></tr>`).join('')}</table></div>` : '<p>No transactions yet.</p>'}
<h2 style="margin-top:48px">Products</h2><div class="table-wrap"><table><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Available</th></tr>${ps.map(p => `<tr><td>${p.img ? `<img class="thumb" src="${e(p.img)}" alt="${e(p.name)}">` : '<small>No photo</small>'}<div class="row" style="gap:6px;margin-top:6px"><label class="btn ghost sm" style="flex-direction:row;cursor:pointer;color:var(--cream)">${p.img ? 'Change' : 'Add photo'}<input type="file" accept="image/*" data-photo="${p.id}" hidden></label>${p.img ? `<button class="btn ghost sm" data-rm="${p.id}">Remove</button>` : ''}</div></td><td>${e(p.name)}</td><td>${e(p.cat)}</td><td>₱${p.price}</td><td>${p.avail ? 'Yes' : 'No'} <button class="btn ghost sm" data-t="${p.id}">${p.avail ? 'Hide' : 'Show'}</button></td></tr>`).join('')}</table></div>
<h3 style="margin:32px 0 12px">Add product</h3><div id="fm"></div><form id="f" class="narrow"><label>Name<input name="name" required></label><label>Description<input name="desc"></label><label>Price (₱)<input type="number" name="price" min="0" step="0.01" required></label><label>Category<select name="cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label><label>Photo (optional)<input type="file" name="photo" id="ph" accept="image/*"></label><img id="pv" class="thumb big" alt="Photo preview" hidden><div><button class="btn">Add product</button></div></form>`;
    app.querySelectorAll('[data-o]').forEach(s => s.onchange = () => { const all = get(K.o, []); all.find(o => o.id == s.dataset.o).status = s.value; set(K.o, all); draw(msg('Order updated.', 'status show')); });
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const all = get(K.p, []), p = all.find(x => x.id == b.dataset.t); p.avail = !p.avail; set(K.p, all); draw(msg('Product updated.', 'status show')); });
    $('ph').onchange = async () => {
      const f = $('ph').files[0]; $('pv').hidden = true; $('fm').innerHTML = '';
      if (!f) return;
      try { $('pv').src = await readPhoto(f); $('pv').hidden = false; } catch (x) { $('ph').value = ''; $('fm').innerHTML = msg(x.message, 'err'); }
    };
    app.querySelectorAll('[data-photo]').forEach(i => i.onchange = async () => {
      try {
        const img = await readPhoto(i.files[0]), all = get(K.p, []);
        all.find(x => x.id == i.dataset.photo).img = img;
        draw(save(K.p, all) ? msg('Photo saved.', 'status show') : msg(FULL, 'err'));
      } catch (x) { draw(msg(x.message, 'err')); }
    });
    app.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const all = get(K.p, []); delete all.find(x => x.id == b.dataset.rm).img; set(K.p, all); draw(msg('Photo removed.', 'status show')); });
    $('f').onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData($('f'))), all = get(K.p, []);
      let img = '';
      try { if (d.photo && d.photo.size) img = await readPhoto(d.photo); } catch (x) { return $('fm').innerHTML = msg(x.message, 'err'); }
      all.push({ id: Date.now(), cat: d.cat, name: d.name.trim(), desc: d.desc.trim(), price: parseFloat(d.price), avail: true, img });
      if (!save(K.p, all)) return $('fm').innerHTML = msg(FULL, 'err');
      draw(msg('Product added.', 'status show'));
    };
  };
  draw();
  // Buyer and admin may be open in different tabs: refresh the dashboard when a buyer's order/payment changes.
  window.addEventListener('storage', ev => {
    if ([K.o, K.t, K.u, K.p].includes(ev.key) && !(document.activeElement && document.activeElement.closest('form'))) draw();
  });
}

// Home + Menu: products come from the same data the admin edits, so new products/photos show up automatically.
function catalog() {
  const home = document.body.dataset.page === 'home', box = $('products');
  if (!box) return;
  const draw = () => {
    let ps = get(K.p, []).filter(p => p.avail);
    if (home) ps = [...ps].sort((a, b) => b.id - a.id).slice(0, 6); // newest first, so the admin sees a new item right away
    const act = box.dataset.cat;
    box.innerHTML = ps.map(p => `<article class="card" data-cat="${e(p.cat)}"${act && act !== 'All' && p.cat !== act ? ' hidden' : ''}>${p.img ? `<img class="pimg" src="${e(p.img)}" alt="${e(p.name)}">` : '<div class="ph sm">No photo yet</div>'}<h3>${e(p.name)}</h3><p>${e(p.desc)}</p><div class="bar"><span class="price">₱${p.price}</span><button class="btn" data-add="${e(p.name)}">Add to order</button></div></article>`).join('') || '<p>No items available right now.</p>';
  };
  draw();
  box.onclick = ev => {
    const b = ev.target.closest('[data-add]'), s = $('status');
    if (b && s) { s.textContent = 'Added to your order: ' + b.dataset.add; s.classList.add('show'); }
  };
  // Menu category tabs
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-pressed', x === t));
    box.dataset.cat = t.dataset.f; draw();
  });
  // Admin changed something in another tab: refresh without reloading.
  window.addEventListener('storage', ev => { if (ev.key === K.p) draw(); });
}

const app = document.getElementById('app');
(async () => {
  if (!get(K.u, []).length) set(K.u, [{ id: 1, name: 'Admin', email: 'admin@gunitakopi.ph', hash: await hash('admin12345'), role: 'admin' }]);
  if (!get(K.p, []).length) set(K.p, [
    { id: 1, cat: 'Hot Coffee', name: 'Signature Latte', desc: 'Espresso with steamed milk and a hint of caramel.', price: 120, avail: true },
    { id: 2, cat: 'Hot Coffee', name: 'Spanish Brew', desc: 'Sweetened with condensed milk, served hot.', price: 140, avail: true },
    { id: 3, cat: 'Iced', name: 'Cold Brew', desc: 'Steeped for 18 hours and served over ice.', price: 130, avail: true },
    { id: 4, cat: 'Hot Coffee', name: 'Americano', desc: 'Espresso with hot water.', price: 100, avail: true },
    { id: 5, cat: 'Hot Coffee', name: 'Cappuccino', desc: 'Equal parts espresso, milk and foam.', price: 130, avail: true },
    { id: 6, cat: 'Pastries', name: 'Ensaymada', desc: 'Soft, buttery, topped with cheese and sugar.', price: 70, avail: true }]);
  header();
  ({ signup, login, buyer, admin, adminLogin, adminSignup, home: catalog, menu: catalog })[document.body.dataset.page]?.();
})();
