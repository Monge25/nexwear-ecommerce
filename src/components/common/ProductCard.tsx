import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '@/types'
import Price from './Price'
import AuthModal from './AuthModal'
import { useAuth } from '@/hooks/useAuth'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("");
 
  // ── Extraer colores únicos de las variantes ───────────────
  // Agrupa por color para no repetir el mismo color varias veces
  // (una variante Rojo S y Rojo M = un solo swatch Rojo)
  const colorVariants = product.variants
    ? product.variants
        .filter((v) => v.isActive && v.colorHex)
        .reduce<typeof product.variants>((acc, v) => {
          const exists = acc.find((x) => x.colorHex === v.colorHex);
          return exists ? acc : [...acc, v];
        }, [])
    : [];
 
  const activeVariant = colorVariants[activeVariantIndex];
 
  // Imagen activa: la de la variante seleccionada o la del producto base
  const activeImage = activeVariant?.imageUrl ?? product.imageUrl;
 
  // Color de fondo: hex de la variante activa o gris neutro
  const activeBg = activeVariant?.colorHex ?? "#f2f0ec";
 
  const requireAuth = (reason: string, action: () => void) => {
    if (!isAuthenticated) {
      setAuthReason(reason);
      setAuthOpen(true);
    } else {
      action();
    }
  };
 
  const handleNavigate = () => navigate(`/productos/${product.slug}`);
 
  const handleAddToCart = () =>
    requireAuth(
      "Inicia sesión para añadir productos a tu bolsa",
      () => onAddToCart?.(product),
    );
 
  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth("Inicia sesión para guardar tus favoritos", () =>
      setLiked((v) => !v),
    );
  };
 
  return (
    <article className={styles.card}>
      {/* Image */}
      <div className={styles.imgWrap}>
        <div
          className={styles.imgInner}
          style={{ background: activeBg }}
        >
          {activeImage ? (
            <img
              src={activeImage}
              alt={product.name}
              className={styles.img}
            />
          ) : (
            <div className={styles.placeholder}>
              <span>NEXWEAR</span>
            </div>
          )}
        </div>
 
        {/* Badges */}
        <div className={styles.badges}>
          {product.isNew && (
            <span className={`${styles.badge} ${styles.new}`}>Nuevo</span>
          )}
          {product.isSale && product.originalPrice && (
            <span className={`${styles.badge} ${styles.sale}`}>
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </span>
          )}
        </div>
 
        {/* Wishlist */}
        <button
          className={`${styles.wishBtn} ${liked ? styles.liked : ""}`}
          onClick={handleWishlist}
          aria-label="Favorito"
        >
          {liked ? "♥" : "♡"}
        </button>
 
        {/* Actions overlay */}
        <div className={styles.actions}>
          <button className={styles.addBtn} onClick={handleAddToCart}>
            Añadir a la Bolsa
          </button>
          <button
            className={styles.detBtn}
            onClick={handleNavigate}
            aria-label="Ver detalle"
          >
            ⤢
          </button>
        </div>
      </div>
 
      {/* Info */}
      <div className={styles.info}>
        <p className={styles.cat}>
          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        </p>
        <h3 className={styles.name} onClick={handleNavigate}>
          {product.name}
        </h3>
        <Price
          price={product.price}
          originalPrice={product.originalPrice}
          size="sm"
        />
 
        {/* Swatches de color — máximo 4 */}
        {colorVariants.length > 0 && (
          <div className={styles.swatches}>
            {colorVariants.slice(0, 4).map((v, i) => (
              <button
                key={v.id}
                className={`${styles.swatch} ${i === activeVariantIndex ? styles.swatchActive : ""}`}
                style={{ background: v.colorHex ?? "#ccc" }}
                title={v.color ?? ""}
                onClick={() => setActiveVariantIndex(i)}
              />
            ))}
            {/* Si hay más de 4 colores, mostrar contador */}
            {colorVariants.length > 4 && (
              <span className={styles.moreColors}>
                +{colorVariants.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
 
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason={authReason}
      />
    </article>
  );
};
 
export default ProductCard;