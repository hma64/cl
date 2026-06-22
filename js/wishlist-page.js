import { getWishlist, removeFromWishlist } from "./wishlist.js";
import { formatPrice } from "./product-model.js";
import { escapeHtml } from "./utils.js";
import { getLang, setLang, i18n } from "./i18n.js";

const wishlistContainer = document.getElementById("wishlistContainer");
const wishlistEmpty = document.getElementById("wishlistEmpty");
const wishlistCount = document.getElementById("wishlistCount");
const backLink = document.getElementById("backLink");
const langToggleBtn = document.getElementById("langToggleBtn");
const langMenu = document.getElementById("langMenu");
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

function renderWishlist() {
  const wishlist = getWishlist();
  const lang = getLang();

  if (wishlist.length === 0) {
    wishlistContainer.innerHTML = "";
    wishlistEmpty.style.display = "block";
    wishlistCount.textContent = "";
  } else {
    wishlistEmpty.style.display = "none";
    wishlistCount.textContent = `${wishlist.length} منتج${wishlist.length > 1 ? '' : ''}`;
    
    wishlistContainer.innerHTML = wishlist.map((item) => `
      <article class="wishlist-item-card" data-id="${escapeHtml(item.id)}">
        <a href="product.html?id=${encodeURIComponent(item.id)}" class="wishlist-item-image-wrap image-wrapper">
          <div class="skeleton-image"></div>
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        </a>
        <div class="wishlist-item-info">
          <h3 class="wishlist-item-name">${escapeHtml(item.name)}</h3>
          <p class="wishlist-item-price">${formatPrice(item.price)}</p>
          <div class="wishlist-item-actions">
            <a href="product.html?id=${encodeURIComponent(item.id)}" class="btn btn-outline btn-sm">عرض المنتج</a>
            <button type="button" class="btn btn-secondary btn-sm wishlist-remove-btn" data-id="${escapeHtml(item.id)}">إزالة</button>
          </div>
        </div>
      </article>
    `).join("");

    // Add event listeners for remove buttons and image skeleton loaders
    document.querySelectorAll(".wishlist-remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = btn.dataset.id;
        removeFromWishlist(id);
        renderWishlist();
      });
    });
    
    document.querySelectorAll(".wishlist-item-card").forEach(card => {
      const img = card.querySelector("img");
      const skeleton = card.querySelector(".skeleton-image");
      if (img && skeleton) {
        img.addEventListener("load", () => {
          skeleton.classList.add("hidden");
          img.classList.add("loaded");
        });
        img.addEventListener("error", () => {
          skeleton.classList.add("hidden");
          img.style.display = "none";
        });
        if (img.complete) {
          if (img.naturalWidth && img.naturalWidth > 0) {
            skeleton.classList.add("hidden");
            img.classList.add("loaded");
          } else {
            skeleton.classList.add("hidden");
            img.style.display = "none";
          }
        }
      }
    });
  }
}

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "ar" ? "ar" : "fr";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  if (backLink) backLink.textContent = i18n[lang].backShop || "العودة للمتجر";
  
  langToggleBtn.innerHTML =
    lang === "ar"
      ? `<span dir="rtl" style="font-weight:800;">العربية</span>`
      : `<span style="font-weight:800;">Français</span>`;

  document.getElementById("langOptionFr").textContent = i18n.fr.langFr;
  document.getElementById("langOptionAr").textContent = i18n.ar.langAr;
  document.querySelectorAll(".nav-lang-opt").forEach((b) => b.classList.toggle("active-lang", b.dataset.lang === lang));
}

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
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
    applyI18n();
  });
});

menuBtn?.addEventListener("click", () => {
  menuBtn.classList.toggle("open");
  navLinks.classList.toggle("open");
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

document.getElementById("year").textContent = String(new Date().getFullYear());

applyI18n();
renderWishlist();
