import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  sanitizeProduct,
  getPriceData,
  isOutOfStockGlobally,
  formatPrice
} from "./product-model.js";
import { resolveColor } from "./colors.js";
import { getCart, setCart } from "./cart.js";
import { addToWishlist, isInWishlist } from "./wishlist.js";
import { escapeHtml, formatCategoryName } from "./utils.js";
import { getLang, setLang, i18n } from "./i18n.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentProduct = null;
let selectedColor = "";
let selectedQuantity = 1;

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const detailMainImage   = document.getElementById("detailMainImage");
const detailGallery     = document.getElementById("detailGallery");
const detailName        = document.getElementById("detailName");
const detailPrice       = document.getElementById("detailPrice");
const detailCategory    = document.getElementById("detailCategory");
const detailTagText     = document.getElementById("detailTagText");
const detailDescription = document.getElementById("detailDescription");
const colorOptions      = document.getElementById("colorOptions");
const selectionError    = document.getElementById("selectionError");
const stockMsg          = document.getElementById("stockMsg");
const addToCartBtn      = document.getElementById("addToCartBtn");
const qtyInput          = document.getElementById("qtyInput");
const qtyMinus          = document.getElementById("qtyMinus");
const qtyPlus           = document.getElementById("qtyPlus");
const addToWishlistBtn  = document.getElementById("addToWishlistBtn");
const langToggleBtn     = document.getElementById("langToggleBtn");
const langMenu          = document.getElementById("langMenu");
const menuBtn           = document.getElementById("menuBtn");
const navLinks          = document.getElementById("navLinks");
const mainImageSkeleton = document.getElementById("mainImageSkeleton");

// ── Image skeleton ───────────────────────────────────────────────────────────
function showImageSkeleton() {
  if (mainImageSkeleton) mainImageSkeleton.classList.remove("hidden");
  if (detailMainImage) {
    detailMainImage.classList.remove("loaded");
    detailMainImage.style.display = "";
  }
}

function hideImageSkeleton() {
  if (mainImageSkeleton) mainImageSkeleton.classList.add("hidden");
  if (detailMainImage) detailMainImage.classList.add("loaded");
}

if (detailMainImage) {
  detailMainImage.addEventListener("load", () => {
    hideImageSkeleton();
    detailMainImage.classList.add("loaded");
  });
  detailMainImage.addEventListener("error", () => {
    hideImageSkeleton();
    detailMainImage.style.display = "none";
  });
  if (detailMainImage.complete) {
    if (detailMainImage.naturalWidth && detailMainImage.naturalWidth > 0) {
      hideImageSkeleton();
    } else {
      hideImageSkeleton();
      detailMainImage.style.display = "none";
    }
  }
}

// ── i18n ─────────────────────────────────────────────────────────────────────
function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "ar" ? "ar" : "fr";
  document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";

  const keys = [
    ["navHome",       "navHome"],
    ["navShop",       "navShop"],
    ["navCategories", "navCategories"],
    ["navContact",    "navContact"],
    ["btnAllProducts","navAllProducts"],
    ["labelColor",    "colorLabel"],
    ["addToCartBtn",  "addToCart"],
    ["backLink",      "backShop"]
  ];
  keys.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = i18n[lang][key];
  });

  if (langToggleBtn) {
    langToggleBtn.innerHTML = lang === "ar"
      ? `<span dir="rtl" style="font-weight:800;">العربية</span>`
      : `<span style="font-weight:800;">Français</span>`;
  }

  const optFr = document.getElementById("langOptionFr");
  const optAr = document.getElementById("langOptionAr");
  if (optFr) optFr.textContent = i18n.fr.langFr;
  if (optAr) optAr.textContent = i18n.ar.langAr;

  const cartLabel = document.getElementById("cartLabelText");
  if (cartLabel) cartLabel.textContent = i18n[lang].cartLabel;

  document.querySelectorAll(".nav-lang-opt").forEach((b) =>
    b.classList.toggle("active-lang", b.dataset.lang === lang)
  );

  if (currentProduct) {
    const isOos = isOutOfStockGlobally(currentProduct);
    if (addToCartBtn) {
      addToCartBtn.textContent = isOos ? i18n[lang].productOos : "أطلب الآن";
      addToCartBtn.disabled = isOos;
    }
  }
}

// ── Option buttons (colors) ──────────────────────────────────────────────────
function renderOptionButtons(container, values, type) {
  if (!container) return;
  container.innerHTML = "";
  values.forEach((value) => {
    const btn = document.createElement("button");
    if (type === "color") {
      btn.className = "option-btn color-label";
      btn.textContent = value;
      btn.title = value;
      btn.setAttribute("aria-label", value);
    } else {
      btn.className = "option-btn";
      btn.textContent = value;
    }
    btn.type = "button";
    btn.addEventListener("click", () => {
      const alreadySelected = btn.classList.contains("selected");
      if (alreadySelected) {
        btn.classList.remove("selected");
        if (type === "color") selectedColor = "";
        return;
      }
      container.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      if (type === "color") selectedColor = value;
      if (selectionError) selectionError.textContent = "";
    });
    container.appendChild(btn);
  });
}

// ── Gallery ──────────────────────────────────────────────────────────────────
function renderGallery(images) {
  if (!detailGallery) return;
  detailGallery.innerHTML = "";
  images.forEach((imgUrl, index) => {
    const thumb = document.createElement("button");
    thumb.className = `thumb ${index === 0 ? "active" : ""}`;
    thumb.type = "button";
    thumb.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="" />`;
    thumb.addEventListener("click", () => {
      showImageSkeleton();
      if (detailMainImage) detailMainImage.src = imgUrl;
      detailGallery.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
    detailGallery.appendChild(thumb);
  });
}

// ── Render product ───────────────────────────────────────────────────────────
function openProductDetails(product) {
  const lang = getLang();
  const L = i18n[lang];

  const labelColor = document.getElementById("labelColor");
  if (labelColor) labelColor.textContent = L.colorLabel;

  currentProduct   = product;
  selectedColor    = "";
  selectedQuantity = 1;
  if (qtyInput) qtyInput.value = "1";
  if (selectionError) selectionError.textContent = "";
  if (stockMsg)       stockMsg.textContent = "";

  if (detailName)        detailName.textContent = product.name;
  if (detailDescription) detailDescription.textContent = product.description;
  if (detailCategory)    detailCategory.textContent = formatCategoryName(product.category);
  if (detailTagText)     detailTagText.textContent = product.tag || "";

  const priceData = getPriceData(product);
  if (detailPrice) {
    detailPrice.innerHTML = `${formatPrice(priceData.finalPrice)}${
      priceData.oldPrice ? ` <span class="old-price">${formatPrice(priceData.oldPrice)}</span>` : ""
    }`;
  }

  showImageSkeleton();
  if (detailMainImage) {
    detailMainImage.src = product.image;
    detailMainImage.alt = product.name;
  }

  const oos = isOutOfStockGlobally(product);
  if (addToCartBtn) {
    addToCartBtn.disabled = oos;
    addToCartBtn.textContent = oos ? i18n[lang].productOos : "أطلب الآن";
  }

  if (addToWishlistBtn) {
    addToWishlistBtn.textContent = isInWishlist(product.id)
      ? "في القائمة ✓"
      : "أضف إلى القائمة";
  }

  renderGallery(product.images);
  renderOptionButtons(colorOptions, product.colors, "color");

  const colorGroup = colorOptions?.closest(".option-group");
  if (colorGroup) {
    colorGroup.style.display = product.colors.length ? "" : "none";
  }

  // Hide size groups that don't exist in the simplified product model
  ["usaGroup", "eurGroup", "sizeGroup", "sizeSwitcher"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

// ── Load product from Firestore ──────────────────────────────────────────────
async function loadOneProduct() {
  const lang = getLang();
  const root = document.getElementById("productRoot");

  if (!productId) {
    if (root) root.prepend(
      Object.assign(document.createElement("p"), {
        className: "state-box",
        textContent: i18n[lang].productNotFound
      })
    );
    return;
  }

  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) {
      if (root) root.prepend(
        Object.assign(document.createElement("p"), {
          className: "state-box",
          textContent: i18n[lang].productNotFound
        })
      );
      return;
    }
    const product = sanitizeProduct(snap.id, snap.data());
    openProductDetails(product);
  } catch (e) {
    console.error(e);
    if (root) root.prepend(
      Object.assign(document.createElement("p"), {
        className: "state-box",
        textContent: i18n[lang].loadError
      })
    );
  }
}

// ── Add to cart ──────────────────────────────────────────────────────────────
function addProductToCart(product, color, quantity = 1) {
  const priceData = getPriceData(product);
  const cart = getCart();
  cart.push({
    cartId:    `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    name:      product.name,
    image:     product.image,
    color:     color || "-",
    unitPrice: priceData.finalPrice,
    qty:       quantity
  });
  setCart(cart);
}

addToCartBtn?.addEventListener("click", () => {
  const lang = getLang();
  if (!currentProduct) return;

  const needColor = currentProduct.colors && currentProduct.colors.length > 0;
  if (needColor && !selectedColor) {
    if (selectionError) selectionError.textContent = i18n[lang].needSelections;
    return;
  }
  if (isOutOfStockGlobally(currentProduct)) {
    if (selectionError) selectionError.textContent = i18n[lang].productOos;
    return;
  }

  addProductToCart(currentProduct, selectedColor, selectedQuantity);
  if (selectionError) selectionError.textContent = "";
  sessionStorage.setItem("lux_open_cart", "1");
  window.location.href = "produits.html";
});

// ── Quantity ─────────────────────────────────────────────────────────────────
qtyMinus?.addEventListener("click", () => {
  const current = parseInt(qtyInput.value) || 1;
  if (current > 1) { qtyInput.value = current - 1; selectedQuantity = current - 1; }
});
qtyPlus?.addEventListener("click", () => {
  const current = parseInt(qtyInput.value) || 1;
  if (current < 999) { qtyInput.value = current + 1; selectedQuantity = current + 1; }
});
qtyInput?.addEventListener("change", () => {
  let value = parseInt(qtyInput.value) || 1;
  value = Math.max(1, Math.min(999, value));
  qtyInput.value = value;
  selectedQuantity = value;
});

// ── Wishlist ──────────────────────────────────────────────────────────────────
addToWishlistBtn?.addEventListener("click", () => {
  if (!currentProduct) return;
  const added = addToWishlist({
    id:    currentProduct.id,
    name:  currentProduct.name,
    image: currentProduct.image,
    price: getPriceData(currentProduct).finalPrice
  });
  if (added && addToWishlistBtn) addToWishlistBtn.textContent = "في القائمة ✓";
});

// ── Language ──────────────────────────────────────────────────────────────────
langToggleBtn?.addEventListener("click", () => langMenu?.classList.toggle("open"));
langMenu?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-lang]");
  if (!btn) return;
  setLang(btn.dataset.lang);
  langMenu?.classList.remove("open");
  applyI18n();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".lang-dropdown")) langMenu?.classList.remove("open");
});

document.querySelectorAll(".nav-lang-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.lang);
    if (menuBtn) menuBtn.classList.remove("open");
    if (navLinks) navLinks.classList.remove("open");
    applyI18n();
  });
});

// ── Mobile nav ────────────────────────────────────────────────────────────────
menuBtn?.addEventListener("click", () => {
  menuBtn.classList.toggle("open");
  navLinks?.classList.toggle("open");
});
navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuBtn?.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

// ── Year ─────────────────────────────────────────────────────────────────────
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// ── Init ──────────────────────────────────────────────────────────────────────
applyI18n();
loadOneProduct();
