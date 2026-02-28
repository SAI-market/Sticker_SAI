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
let shippingCost = 0; // Por defecto retiro en persona ($0)
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

    // Mensaje si la categoría está vacía
    if (filtered.length === 0) {
        gallery.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: var(--muted); font-size: 1.2rem; font-weight: bold;">Aún no hay stickers en esta categoría. ¡Pronto subiremos más!</div>`;
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
    
    // Forzar la creación de la categoría "Combos"
    if (!cats.includes("Combos")) {
        cats.push("Combos");
    }

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

    // Lógica del Botón Flotante (Subir Arriba)
    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) { scrollTopBtn.classList.remove("hidden"); } 
        else { scrollTopBtn.classList.add("hidden"); }
    });
    scrollTopBtn.onclick = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Selección de Envío/Retiro
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            shippingMethod = e.target.value;
            shippingCost = (shippingMethod === "envio") ? 1500 : 0;
            updateCartUI(); // Recalcula el total
        });
    });

    // Material y Medida
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

    // Checkout Integrando Envío
    document.getElementById("checkoutBtn").onclick = () => {
        const items = Object.values(cart);
        if(items.length === 0){ alert("El carrito está vacío."); return; }
        
        let subtotalProductos = 0;
        let msgList = items.map(i => {
            let subtotal = i.price * i.qty;
            subtotalProductos += subtotal;
            let priceText = i.price > 0 ? `($${subtotal})` : `(A cotizar)`;
            return `- ${i.name} | ${i.material.toUpperCase()} | ${i.size} | x${i.qty} ${priceText}`;
        });

        let totalFinal = subtotalProductos + shippingCost;
        let entregaStr = shippingMethod === "envio" ? `Envío ($1500)` : `Retiro en persona (Gratis)`;

        const message = `Hola! Quiero hacer un pedido:\n\n${msgList.join("\n")}\n\n📦 *Método de entrega:* ${entregaStr}\n💰 *Total estimado:* $${totalFinal}`;
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

function updateCartUI() {
    const count = Object.values(cart).reduce((acc, item) => acc + item.qty, 0);
    document.getElementById("cartCount").textContent = count;
    
    const container = document.getElementById("cartItems");
    container.innerHTML = "";
    
    let subtotalProductos = 0;

    Object.keys(cart).forEach(key => {
        const item = cart[key];
        let subtotal = item.price * item.qty;
        subtotalProductos += subtotal;
        let priceStr = item.price > 0 ? `$${subtotal}` : "A cotizar";

        const div = document.createElement("div");
        div.style.display = "flex"; div.style.justifyContent = "space-between"; div.style.alignItems = "center";
        div.style.padding = "10px 0"; div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
        div.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span class="cart-item-name" style="font-weight:bold;">${item.name} x${item.qty}</span>
                <span style="font-size:0.85rem; color:var(--muted);">${item.material.toUpperCase()} - ${item.size} (${priceStr})</span>
            </div>
            <button onclick="removeFromCart('${key}')" style="background:transparent; color:var(--neon); border:none; cursor:pointer; font-weight:bold; font-size:1.2rem;">X</button>
        `;
        container.appendChild(div);
    });

    // Actualizar Total visual
    const summary = document.getElementById("cartSummary");
    if (Object.keys(cart).length === 0) {
        summary.innerHTML = "Total: $0";
    } else {
        let textoTotal = `Subtotal: $${subtotalProductos}`;
        if (shippingCost > 0) textoTotal += `<br>Envío: $${shippingCost}`;
        textoTotal += `<br><strong style="color:var(--neon); font-size:1.4rem;">Total Final: $${subtotalProductos + shippingCost}</strong>`;
        summary.innerHTML = textoTotal;
    }
}

window.removeFromCart = (key) => {
    delete cart[key];
    localStorage.setItem("sai_cart", JSON.stringify(cart));
    updateCartUI();
};

function setupTheme() {
    if (localStorage.getItem("theme") === "active") { document.body.classList.add("active"); }
    themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle("active");
        localStorage.setItem("theme", isDark ? "active" : "light");
    };
}

init();