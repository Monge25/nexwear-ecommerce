import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "@/types";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import styles from "./TrendingCard.module.css";

interface Props {
  product: Product;
  onAddToCart: (p: Product) => void;
}

const TrendingCard: React.FC<Props> = ({ product: p, onAddToCart }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { has, toggle } = useWishlist();
  const [imgErr, setImgErr] = useState(false);

  const liked = isAuthenticated ? has(p.id) : false;
  const img = p.imageUrl && !imgErr ? p.imageUrl : null;
  const bg = p.colors?.[0]?.hex ?? "#f0ede8";

  const goToDetail = () => navigate(`/productos/${p.slug}`);

  const handleWish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    toggle(p);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(p);
  };

  return (
    <article className={styles.card} onClick={goToDetail}>
      <div className={styles.imgWrap}>
        {/* Imagen */}
        {img ? (
          <img
            src={img}
            alt={p.name}
            className={styles.img}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className={styles.placeholder} style={{ background: bg }}>
            <span>Nexwear</span>
          </div>
        )}

        {/* Badges */}
        {(p.isNew || p.isSale) && (
          <div className={styles.badges}>
            {p.isNew && (
              <span className={`${styles.badge} ${styles.badgeNew}`}>
                Nuevo
              </span>
            )}
            {p.isSale && (
              <span className={`${styles.badge} ${styles.badgeSale}`}>
                Rebaja
              </span>
            )}
          </div>
        )}

        {/* Wishlist — esquina superior derecha, siempre visible */}
        <button
          className={`${styles.wishBtn} ${liked ? styles.wishOn : ""}`}
          onClick={handleWish}
          aria-label="Favorito"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Bottom bar — "Añadir a la bolsa" + expandir, aparece en hover */}
        <div className={styles.bottomBar}>
          <button className={styles.addToBag} onClick={handleAdd}>
            Añadir a la bolsa
          </button>
          <button
            className={styles.expandBtn}
            onClick={goToDetail}
            aria-label="Ver detalle"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
};

export default TrendingCard;
