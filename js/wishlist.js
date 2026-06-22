// ── Wishlist Management ──────────────────────────────────────────────────────

export function getWishlist() {
  try {
    const data = localStorage.getItem("lux_wishlist");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading wishlist:", err);
    return [];
  }
}

export function setWishlist(items) {
  try {
    localStorage.setItem("lux_wishlist", JSON.stringify(items));
  } catch (err) {
    console.error("Error saving wishlist:", err);
  }
}

export function addToWishlist(product) {
  const wishlist = getWishlist();
  const exists = wishlist.some((item) => item.id === product.id);
  if (!exists) {
    wishlist.push(product);
    setWishlist(wishlist);
    return true;
  }
  return false;
}

export function removeFromWishlist(productId) {
  const wishlist = getWishlist();
  const updated = wishlist.filter((item) => item.id !== productId);
  setWishlist(updated);
  return updated.length < wishlist.length;
}

export function isInWishlist(productId) {
  const wishlist = getWishlist();
  return wishlist.some((item) => item.id === productId);
}

export function getWishlistCount() {
  return getWishlist().length;
}
