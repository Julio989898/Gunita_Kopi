// ====== EDIT THESE ======
const FB_PAGE = "gunitakopi"; // your Facebook page username (facebook.com/<username>)
const MENU = [
  // name, category, description, price (placeholder prices: replace with real ones), featured
  { n: "Kapeng Barako", c: "Hot Coffee", d: "Bold, strong Batangas-style brew.", p: 70, f: 1 },
  { n: "Americano", c: "Hot Coffee", d: "Simple, clean espresso with hot water.", p: 65 },
  { n: "Cappuccino", c: "Hot Coffee", d: "Espresso with steamed milk and foam.", p: 85 },
  { n: "Café Latte", c: "Hot Coffee", d: "Smooth and milky, easy to sip.", p: 90 },
  { n: "Iced Caramel Macchiato", c: "Iced Coffee", d: "Layered espresso, milk, and caramel.", p: 110, f: 1 },
  { n: "Iced Americano", c: "Iced Coffee", d: "Cold, crisp, and strong.", p: 80 },
  { n: "Iced Spanish Latte", c: "Iced Coffee", d: "Sweet condensed milk over espresso.", p: 105, f: 1 },
  { n: "Iced Mocha", c: "Iced Coffee", d: "Chocolate and espresso over ice.", p: 100 },
  { n: "Croissant", c: "Pastries & Snacks", d: "Buttery and flaky.", p: 60 },
  { n: "Banana Bread", c: "Pastries & Snacks", d: "Moist slice, great with coffee.", p: 55 },
  { n: "Cookies", c: "Pastries & Snacks", d: "Freshly baked, chewy center.", p: 45 },
  { n: "Tapsilog", c: "Rice Meals", d: "Beef tapa, garlic rice, and egg.", p: 120 },
  { n: "Chicken Adobo Rice", c: "Rice Meals", d: "Home-style adobo with rice.", p: 110 },
  { n: "Longsilog", c: "Rice Meals", d: "Sweet longganisa, garlic rice, and egg.", p: 105 },
];
const GALLERY = [
  ["Drinks", "Iced latte on the counter"], ["Drinks", "Fresh hot coffee"], ["Store", "Window seats"],
  ["Store", "Counter and menu board"], ["Events", "Study night"], ["Drinks", "Pastry and coffee"],
  ["Store", "Café entrance"], ["Events", "Community hangout"],
];
// ========================

const $ = (s) => document.querySelector(s);
const peso = (n) => "₱" + n.toLocaleString();
let cart = {}; // name -> qty

/* ---- Page routing ---- */
const pages = ["home", "about", "services", "menu", "gallery", "contact"];
function route() {
  const id = pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
  pages.forEach((p) => $("#" + p).classList.toggle("show", p === id));
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.hash === "#" + id));
  $("#nav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
$("#burger").onclick = () => {
  const open = $("#nav").classList.toggle("open");
  $("#burger").setAttribute("aria-expanded", open);
};

/* ---- Menu ---- */
const cats = [...new Set(MENU.map((m) => m.c))];
let activeCat = cats[0];
function card(m) {
  return `<article class="card"><h3>${m.n}</h3><p>${m.d}</p>
  <div class="meta"><span class="price">${peso(m.p)}</span>
  <button class="btn" data-add="${m.n}" aria-label="Add ${m.n} to order">Add</button></div></article>`;
}
function renderMenu() {
  $("#tabs").innerHTML = cats.map((c) =>
    `<button role="tab" aria-selected="${c === activeCat}" data-cat="${c}">${c}</button>`).join("");
  $("#menuGrid").innerHTML = MENU.filter((m) => m.c === activeCat).map(card).join("");
}
$("#tabs").onclick = (e) => {
  if (e.target.dataset.cat) { activeCat = e.target.dataset.cat; renderMenu(); }
};
$("#featured").innerHTML = MENU.filter((m) => m.f).map(card).join("");
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-add]");
  if (b) {
    cart[b.dataset.add] = (cart[b.dataset.add] || 0) + 1;
    renderCart();
    $("#menuStatus").textContent = `${b.dataset.add} added to your order.`;
  }
  if (e.target.closest("[data-open-cart]")) openCart(true);
});

/* ---- Cart ---- */
function renderCart() {
  const items = Object.entries(cart);
  let total = 0, count = 0;
  $("#cartItems").innerHTML = items.length ? items.map(([n, q]) => {
    const price = MENU.find((m) => m.n === n).p; total += price * q; count += q;
    return `<div class="line"><span>${n}<br><small>${peso(price)} each</small></span>
    <span class="qty"><button data-q="${n}" data-d="-1" aria-label="Remove one ${n}">−</button>${q}
    <button data-q="${n}" data-d="1" aria-label="Add one ${n}">+</button></span></div>`;
  }).join("") : "<p>Your order is empty. Open the menu and tap Add.</p>";
  $("#cartTotal").textContent = peso(total);
  $("#cartCount").textContent = count;
}
$("#cartItems").onclick = (e) => {
  const b = e.target.closest("[data-q]"); if (!b) return;
  cart[b.dataset.q] += +b.dataset.d;
  if (cart[b.dataset.q] <= 0) delete cart[b.dataset.q];
  renderCart();
};
function openCart(on) {
  $("#cart").classList.toggle("open", on);
  $("#scrim").classList.toggle("on", on);
  $("#cart").setAttribute("aria-hidden", !on);
  if (on) $("#closeCart").focus(); else $("#orderBtn").focus();
}
$("#orderBtn").onclick = () => openCart(true);
$("#closeCart").onclick = $("#scrim").onclick = () => openCart(false);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") openCart(false); });
$("#clearCart").onclick = () => { cart = {}; renderCart(); $("#cartStatus").textContent = ""; };
$("#sendOrder").onclick = () => {
  const items = Object.entries(cart), st = $("#cartStatus");
  st.className = "status";
  if (!items.length) { st.className = "status err"; st.textContent = "Add at least one item first."; return; }
  const name = $("#cName").value.trim();
  if (!name) { st.className = "status err"; st.textContent = "Please enter a name for pickup."; $("#cName").focus(); return; }
  let total = 0;
  const lines = items.map(([n, q]) => { const p = MENU.find((m) => m.n === n).p; total += p * q; return `${q}x ${n} (${peso(p * q)})`; });
  const text = `Hi Gunita Kopi! Pre-order for pickup.\nName: ${name}\n${lines.join("\n")}\nTotal: ${peso(total)}`;
  navigator.clipboard?.writeText(text).catch(() => {});
  st.textContent = "Order copied. Messenger is opening. Paste it in the chat if it does not appear.";
  window.open(`https://m.me/${FB_PAGE}`, "_blank", "noopener");
};

/* ---- Gallery ---- */
const gcats = ["All", "Drinks", "Store", "Events"]; let gcat = "All";
function renderGallery() {
  $("#galTabs").innerHTML = gcats.map((c) => `<button aria-selected="${c === gcat}" data-g="${c}">${c}</button>`).join("");
  $("#galGrid").innerHTML = GALLERY.filter((g) => gcat === "All" || g[0] === gcat)
    .map((g) => `<figure style="margin:0"><div class="ph" role="img" aria-label="${g[1]}"><span>${g[1]}</span></div></figure>`).join("");
}
$("#galTabs").onclick = (e) => { if (e.target.dataset.g) { gcat = e.target.dataset.g; renderGallery(); } };

/* ---- Contact form (front-end only: connect to a backend or Formspree to really send) ---- */
$("#msgLink").href = `https://m.me/${FB_PAGE}`;
$("#form").onsubmit = (e) => {
  e.preventDefault();
  const st = $("#formStatus"), f = [$("#fn"), $("#fe"), $("#fm")];
  f.forEach((i) => i.setAttribute("aria-invalid", !i.value.trim()));
  const emailOk = /^\S+@\S+\.\S+$/.test($("#fe").value);
  if (f.some((i) => !i.value.trim()) || !emailOk) {
    st.className = "status err"; st.textContent = "Please fill in your name, a valid email, and a message."; return;
  }
  st.className = "status"; st.textContent = "Message sent. Thank you, we will reply soon.";
  e.target.reset();
};

renderMenu(); renderGallery(); renderCart(); route();
