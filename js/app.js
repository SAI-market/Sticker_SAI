const STICKERS_PATH = "stickers/";
const MANIFEST_PATH = "stickers/manifest.json";
const CONFIG_PATH = "config.json";

// Elementos Principales
const gallery = document.getElementById("gallery");
const themeToggle = document.getElementById("themeToggle");
const scrollTopBtn = document.getElementById("scrollTopBtn");
let WHATSAPP_NUMBER = "";

// Modales
const cartModal = document.getElementById("cartModal");
const sizeModal = document.getElementById("sizeModal");
const contactModal = document.getElementById("contactModal");
const previewModal = document.getElementById("previewModal");

// --- SISTEMA DE PRECIOS BASE ---
const PRICES = {
    "sticker": { "4x4": 100, "5x5": 150, "6x6": 200 },
    "vinilo": { "4x4": 250, "5x5": 300, "6x6": 400 }
};

// Variables de Estado
let stickers = [];
let cart = JSON.parse(localStorage.getItem("sai_cart") || "{}");
let selectedCategory = null;
let pendingSticker = null;
let selectedSize = null;
let selectedMaterial = "sticker";
let shippingCost = 0;
let shippingMethod = "retiro";

async function init() {
    await fetchConfig();
    await loadManifest();
    renderCategories();
    renderGallery();
    updateCartUI();
    setupEventListeners();
    setupTheme();
}

async function fetchConfig() {
    try {
        const r = await fetch(CONFIG_PATH);
        if (r.ok) { const cfg = await r.json(); WHATSAPP_NUMBER = cfg.whatsapp || ""; }
    } catch (e) { console.warn("No config.json found"); }
}

async function loadManifest() {
    try {
        const r = await fetch(MANIFEST_PATH);
        const data = await r.json();
        const items = Array.isArray(data) ? data : (data.all || []);
        stickers = items.map(item => {
            if (typeof item === "string") {
                const parts = item.split('/');
                return {
                    name: parts.pop().replace(/\.[^/.]+$/, ""),
                    path: item,
                    category: parts.length > 1 ? parts[0] : "General"
                };
            }
            return item;
        });
    } catch (e) { console.error("Error cargando stickers"); }
}

function renderGallery() {
    gallery.innerHTML = "";
    const q = document.getElementById("search").value.toLowerCase();
    const filtered = stickers.filter(s => (selectedCategory === null || s.category === selectedCategory) && s.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
        gallery.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: var(--muted); font-size: 1.2rem; font-weight: bold;">No se encontraron resultados.</div>`;
        return;
    }

    filtered.forEach(s => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="thumb"><img src="${STICKERS_PATH}${s.path}" loading="lazy"></div>
            <div class="filename">${s.name}</div>
            <button class="add-btn" style="width:100%; padding:8px; border-radius:8px; border:none; background:var(--neon); color:var(--bg); font-weight:bold; cursor:pointer;">Agregar</button>
        `;
        
        card.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                document.getElementById("previewImg").src = STICKERS_PATH + s.path;
                document.getElementById("previewName").textContent = s.name;
                previewModal.classList.remove("hidden");
            }
        };

        card.querySelector(".add-btn").onclick = (e) => {
            e.stopPropagation();
            pendingSticker = s;
            selectedSize = null;
            selectedMaterial = "sticker";
            document.querySelectorAll(".material-option").forEach(b => b.classList.remove("active"));
            document.querySelector('.material-option[data-material="sticker"]').classList.add("active");
            document.querySelectorAll(".size-option").forEach(b => b.classList.remove("active"));
            updatePriceDisplay();
            sizeModal.classList.remove("hidden");
        };
        gallery.appendChild(card);
    });
}

function renderCategories() {
    const container = document.getElementById("categoriesContainer");
    const cats = [...new Set(stickers.map(s => s.category))].sort();
    
    container.innerHTML = "";
    
    const createPill = (label, value) => {
        const btn = document.createElement("div");
        btn.className = `category-pill ${selectedCategory === value ? 'active' : ''}`;
        btn.textContent = label;
        btn.onclick = () => { selectedCategory = value; renderCategories(); renderGallery(); };
        container.appendChild(btn);
    };

    createPill("Todas", null);
    cats.forEach(c => createPill(c, c));
}

function updatePriceDisplay() {
    const display = document.getElementById("priceDisplay");
    if (!selectedSize) { display.textContent = "Selecciona una medida"; return; }
    if (selectedSize === "especial") { display.textContent = "Precio: A cotizar"; return; }
    display.textContent = `Precio unitario: $${PRICES[selectedMaterial][selectedSize]}`;
}

function setupEventListeners() {
    document.getElementById("search").oninput = renderGallery;

    // Modales
    document.getElementById("cartBtn").onclick = () => cartModal.classList.remove("hidden");
    document.getElementById("contactBtn").onclick = () => contactModal.classList.remove("hidden");
    document.getElementById("closeCart").onclick = () => cartModal.classList.add("hidden");
    document.getElementById("closeSizeModal").onclick = () => sizeModal.classList.add("hidden");
    document.getElementById("closeContact").onclick = () => contactModal.classList.add("hidden");
    document.getElementById("contactClear").onclick = () => contactModal.classList.add("hidden");
    document.getElementById("closePreview").onclick = () => previewModal.classList.add("hidden");

    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) { scrollTopBtn.classList.remove("hidden"); } 
        else { scrollTopBtn.classList.add("hidden"); }
    });
    scrollTopBtn.onclick = () => { window.scrollTo({ top: 0, behavior: "smooth" }); };

    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            shippingMethod = e.target.value;
            shippingCost = (shippingMethod === "envio") ? 1500 : 0;
            updateCartUI();
        });
    });

    document.querySelectorAll(".material-option").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".material-option").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedMaterial = btn.dataset.material;
            updatePriceDisplay();
        };
    });

    document.querySelectorAll(".size-option").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".size-option").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedSize = btn.dataset.size;
            document.getElementById("specialSizeInput").style.display = selectedSize === "especial" ? "block" : "none";
            updatePriceDisplay();
        };
    });

    document.getElementById("confirmSizeBtn").onclick = () => {
        let size = selectedSize === "especial" ? document.getElementById("customSize").value : selectedSize;
        if (!size) return alert("Por favor elige una medida");
        let unitPrice = (selectedSize === "especial") ? 0 : PRICES[selectedMaterial][selectedSize];
        addToCart(pendingSticker, selectedMaterial, size, unitPrice);
        sizeModal.classList.add("hidden");
    };

    document.getElementById("clearCart").onclick = () => {
        cart = {};
        localStorage.setItem("sai_cart", JSON.stringify(cart));
        updateCartUI();
    };

    // Checkout WhatsApp
    document.getElementById("checkoutBtn").onclick = () => {
        const items = Object.values(cart);
        if(items.length === 0){ alert("El carrito está vacío."); return; }
        
        let qtySticker = 0, subSticker = 0;
        let qtyVinilo = 0, subVinilo = 0;
        let msgList = [];

        items.forEach(i => {
            let sub = i.price * i.qty;
            if (i.material === "sticker") { qtySticker += i.qty; subSticker += sub; }
            if (i.material === "vinilo") { qtyVinilo += i.qty; subVinilo += sub; }
            let priceText = i.price > 0 ? `($${sub})` : `(A cotizar)`;
            msgList.push(`- ${i.name} | ${i.material.toUpperCase()} | ${i.size} | x${i.qty} ${priceText}`);
        });

        let descSticker = 0;
        if (qtySticker >= 25) descSticker = subSticker * 0.20;
        else if (qtySticker >= 15) descSticker = subSticker * 0.10;

        let descVinilo = 0;
        if (qtyVinilo >= 25) descVinilo = subVinilo * 0.20;
        else if (qtyVinilo >= 15) descVinilo = subVinilo * 0.10;

        let totalFinal = subSticker + subVinilo - descSticker - descVinilo + shippingCost;
        let entregaStr = shippingMethod === "envio" ? `Envío ($1500)` : `Retiro en persona (Gratis)`;

        let message = `Hola! Quiero hacer un pedido:\n\n${msgList.join("\n")}\n\n`;
        if (descSticker > 0) message += `🔥 Descuento Stickers Base: -$${descSticker.toFixed(0)}\n`;
        if (descVinilo > 0) message += `🔥 Descuento Vinilos: -$${descVinilo.toFixed(0)}\n`;
        
        message += `\n📦 *Método de entrega:* ${entregaStr}\n💰 *Total a pagar:* $${totalFinal.toFixed(0)}`;
        
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    };

    document.getElementById("contactSend").onclick = () => {
        const msg = document.getElementById("contactMessage").value;
        if(!msg) return alert("Escribe un mensaje");
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
    };
}

function addToCart(sticker, material, size, price) {
    const key = `${sticker.path}-${material}-${size}`;
    if (cart[key]) cart[key].qty++;
    else cart[key] = { ...sticker, material, size, price, qty: 1 };
    localStorage.setItem("sai_cart", JSON.stringify(cart));
    updateCartUI();
}

window.changeQty = (key, delta) => {
    if (!cart[key]) return;
    cart[key].qty += delta;
    if (cart[key].qty <= 0) {
        delete cart[key];
    }
    localStorage.setItem("sai_cart", JSON.stringify(cart));
    updateCartUI();
};

window.removeFromCart = (key) => {
    delete cart[key];
    localStorage.setItem("sai_cart", JSON.stringify(cart));
    updateCartUI();
};

function updatePromoBar(qty, textElId, progressElId) {
    const textEl = document.getElementById(textElId);
    const progressEl = document.getElementById(progressElId);
    
    let target = 25;
    let percent = (qty / target) * 100;
    if (percent > 100) percent = 100;
    progressEl.style.width = `${percent}%`;

    if (qty >= 25) {
        textEl.textContent = `¡20% de Descuento aplicado!`;
        textEl.style.color = "#83d383"; 
    } else if (qty >= 15) {
        textEl.textContent = `¡10% aplicado! Faltan ${25 - qty} para 20%`;
        textEl.style.color = "#83d383"; 
    } else {
        textEl.textContent = `${qty}/15 para 10% de desc.`;
        textEl.style.color = "var(--text)";
    }
}

function updateCartUI() {
    const count = Object.values(cart).reduce((acc, item) => acc + item.qty, 0);
    document.getElementById("cartCount").textContent = count;
    
    const container = document.getElementById("cartItems");
    container.innerHTML = "";
    
    let qtySticker = 0, subSticker = 0;
    let qtyVinilo = 0, subVinilo = 0;

    Object.keys(cart).forEach(key => {
        const item = cart[key];
        let subtotal = item.price * item.qty;
        
        if (item.material === "sticker") { qtySticker += item.qty; subSticker += subtotal; }
        if (item.material === "vinilo") { qtyVinilo += item.qty; subVinilo += subtotal; }

        let priceStr = item.price > 0 ? `$${subtotal}` : "A cotizar";

        const div = document.createElement("div");
        div.style.display = "flex"; div.style.justifyContent = "space-between"; div.style.alignItems = "center";
        div.style.padding = "10px 0"; div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
        
        div.innerHTML = `
            <div style="display:flex; flex-direction:column; flex:1;">
                <span class="cart-item-name" style="font-weight:bold;">${item.name}</span>
                <span style="font-size:0.85rem; color:var(--muted); margin-bottom: 8px;">${item.material.toUpperCase()} - ${item.size} (${priceStr})</span>
                
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="qty-btn" onclick="changeQty('${key}', -1)">-</button>
                    <span style="font-weight:bold; width: 20px; text-align: center;">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('${key}', 1)">+</button>
                </div>
            </div>
            
            <div style="display:flex; align-items:center; gap:12px;">
                <img src="${STICKERS_PATH}${item.path}" style="width: 55px; height: 55px; object-fit: contain; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 2px;">
                <button onclick="removeFromCart('${key}')" title="Quitar item" style="background:transparent; color:var(--neon); border:none; cursor:pointer; font-weight:bold; font-size:1.2rem; margin-left:5px;">X</button>
            </div>
        `;
        container.appendChild(div);
    });

    updatePromoBar(qtySticker, "stickerPromoText", "stickerProgress");
    updatePromoBar(qtyVinilo, "viniloPromoText", "viniloProgress");

    let descSticker = 0;
    if (qtySticker >= 25) descSticker = subSticker * 0.20;
    else if (qtySticker >= 15) descSticker = subSticker * 0.10;

    let descVinilo = 0;
    if (qtyVinilo >= 25) descVinilo = subVinilo * 0.20;
    else if (qtyVinilo >= 15) descVinilo = subVinilo * 0.10;

    const summary = document.getElementById("cartSummary");
    if (Object.keys(cart).length === 0) {
        summary.innerHTML = "Total: $0";
    } else {
        let totalOriginal = subSticker + subVinilo;
        let totalDescuentos = descSticker + descVinilo;
        let totalFinal = totalOriginal - totalDescuentos + shippingCost;

        let textoTotal = `Subtotal: $${totalOriginal}`;
        if (totalDescuentos > 0) textoTotal += `<br><span style="color:var(--neon);">Descuentos Promos: -$${totalDescuentos}</span>`;
        if (shippingCost > 0) textoTotal += `<br>Envío: $${shippingCost}`;
        
        textoTotal += `<br><strong style="color:var(--neon); font-size:1.4rem;">Total Final: $${totalFinal}</strong>`;
        summary.innerHTML = textoTotal;
    }
}

function setupTheme() {
    if (localStorage.getItem("theme") === "active") { document.body.classList.add("active"); }
    themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle("active");
        localStorage.setItem("theme", isDark ? "active" : "light");
    };
}

init();