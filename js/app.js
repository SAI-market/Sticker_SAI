const STICKERS_PATH = "stickers/";
const MANIFEST_PATH = "stickers/manifest.json";

const gallery = document.getElementById("gallery");
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const themeToggle = document.getElementById("themeToggle");
const sizeModal = document.getElementById("sizeModal");
const confirmSizeBtn = document.getElementById("confirmSizeBtn");

let stickers = [];
let cart = JSON.parse(localStorage.getItem("sai_cart") || "{}");
let selectedCategory = null;
let pendingSticker = null;
let selectedSize = null;

async function init() {
    await loadManifest();
    renderCategories();
    renderGallery();
    updateCartUI();
    setupEventListeners();
    setupTheme();
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
    } catch (e) { console.error("Error", e); }
}

function renderCategories() {
    const container = document.getElementById("categoriesContainer");
    const cats = [...new Set(stickers.map(s => s.category))].sort();
    container.innerHTML = "";

    const createPill = (label, catValue) => {
        const pill = document.createElement("div");
        pill.className = `category-pill ${selectedCategory === catValue ? 'active' : ''}`;
        pill.textContent = label;
        pill.onclick = () => {
            selectedCategory = catValue;
            renderCategories();
            renderGallery();
        };
        container.appendChild(pill);
    };

    createPill("Todas", null);
    cats.forEach(c => createPill(c, c));
}

function renderGallery() {
    gallery.innerHTML = "";
    const q = document.getElementById("search").value.toLowerCase();
    
    const filtered = stickers.filter(s => {
        const matchesCat = selectedCategory === null || s.category === selectedCategory;
        const matchesSearch = s.name.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
    });

    filtered.forEach(s => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="thumb"><img src="${STICKERS_PATH}${s.path}" loading="lazy"></div>
            <div class="filename">${s.name}</div>
            <button class="add-btn" style="background:var(--neon); color:var(--bg); border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:700; width:100%;">Agregar</button>
        `;
        card.querySelector(".add-btn").onclick = () => {
            pendingSticker = s;
            sizeModal.classList.remove("hidden");
        };
        gallery.appendChild(card);
    });
}

function setupEventListeners() {
    document.getElementById("search").oninput = renderGallery;
    cartBtn.onclick = () => cartModal.classList.remove("hidden");
    document.getElementById("closeCart").onclick = () => cartModal.classList.add("hidden");
    document.getElementById("closeSizeModal").onclick = () => sizeModal.classList.add("hidden");

    document.querySelectorAll(".size-option").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".size-option").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedSize = btn.dataset.size;
            document.getElementById("specialSizeInput").style.display = selectedSize === "especial" ? "block" : "none";
        };
    });

    confirmSizeBtn.onclick = () => {
        let size = selectedSize;
        if (size === "especial") size = document.getElementById("customSize").value;
        if (!size) return alert("Elige una medida");
        addToCart(pendingSticker, size);
        sizeModal.classList.add("hidden");
    };

    document.getElementById("contactBtn").onclick = () => document.getElementById("contactModal").classList.remove("hidden");
    document.getElementById("closeContact").onclick = () => document.getElementById("contactModal").classList.add("hidden");
    document.getElementById("contactClear").onclick = () => document.getElementById("contactModal").classList.add("hidden");
}

function addToCart(sticker, size) {
    const key = `${sticker.path}-${size}`;
    if (cart[key]) cart[key].qty++;
    else cart[key] = { ...sticker, size, qty: 1 };
    localStorage.setItem("sai_cart", JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const count = Object.values(cart).reduce((acc, item) => acc + item.qty, 0);
    document.getElementById("cartCount").textContent = count;
    const container = document.getElementById("cartItems");
    container.innerHTML = "";
    Object.keys(cart).forEach(key => {
        const item = cart[key];
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.padding = "10px 0";
        div.innerHTML = `<span>${item.name} (${item.size}) x${item.qty}</span> <button onclick="removeFromCart('${key}')">X</button>`;
        container.appendChild(div);
    });
}

window.removeFromCart = (key) => {
    delete cart[key];
    localStorage.setItem("sai_cart", JSON.stringify(cart));
    updateCartUI();
};

function setupTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    }
    themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        themeToggle.textContent = isDark ? "☀️" : "🌙";
    };
}

init();