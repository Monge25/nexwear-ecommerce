import React from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./Wishlist.module.css";

const WishlistModal: React.FC = () => {
  const { items, isOpen, closeWishlist, toggle } = useWishlist();
  const { addItem } = useCart();

  // ─── Share Wishlist ─────────────────────────────
  const handleShare = async () => {
    const ids = items.map((i) => i.id).join(",");

    const shareUrl =
      `${window.location.origin}/wishlist?items=${ids}`;

    // Share nativo móvil
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mi Wishlist Nexwear",
          text: "Mira mis favoritos en Nexwear",
          url: shareUrl
        });
      } catch {
        // cancelado
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Wishlist copiada al portapapeles");
    }
  };


  if (!isOpen) return null;


  return (
    <>
      {/* Overlay */}
      <div
        className={styles.overlay}
        onClick={closeWishlist}
      />

      {/* Panel */}
      <div className={styles.panel}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Favoritos
            </h2>

            <span className={styles.count}>
              {items.length} ARTÍCULOS
            </span>
          </div>

          <div className={styles.headerActions}>
            
            {/* Share */}
            {items.length > 0 && (
              <button
                className={styles.share}
                onClick={handleShare}
              >
                Compartir
              </button>
            )}

            {/* Close */}
            <button
              className={styles.close}
              onClick={closeWishlist}
            >
              ✕
            </button>

          </div>
        </div>


        {/* Items */}
        <div className={styles.items}>
          {items.map((item) => (
            <div
              key={item.id}
              className={styles.item}
            >

              {/* Imagen */}
              <div className={styles.itemImg}>
                <img
                  src={item.imageUrl}
                  alt={item.name}
                />
              </div>

              {/* Info */}
              <div className={styles.itemInfo}>
                <h4 className={styles.itemName}>
                  {item.name}
                </h4>

                <p className={styles.itemPrice}>
                  {formatPrice(item.price)}
                </p>

                {/* Add to Cart */}
                <button
                  className={styles.add}
                  onClick={() =>
                    addItem(
                      item,
                      1,
                      item.sizes?.[0] || "M",
                      item.colors?.[0] || {
                        name: "Negro",
                        hex: "#000"
                      }
                    )
                  }
                >
                  AÑADIR A BOLSA
                </button>

                {/* Remove */}
                <button
                  className={styles.remove}
                  onClick={() => toggle(item)}
                >
                  Eliminar
                </button>

              </div>
            </div>
          ))}
        </div>


        {/* Empty */}
        {items.length === 0 && (
          <div className={styles.empty}>
            No tienes favoritos aún
          </div>
        )}

      </div>
    </>
  );
};

export default WishlistModal;