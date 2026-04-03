import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product, ProductVariant } from '@/types'
import Price from './Price'
import AuthModal from './AuthModal'
import { useAuth } from '@/hooks/useAuth'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

// Agrupa variantes por color → un swatch por color único
function groupByColor(variants: ProductVariant[]) {
  const map = new Map<string, { colorHex: string; imageUrl: string; variants: ProductVariant[] }>()
  for (const v of variants) {
    if (!v.isActive) continue
    if (!v.color || !v.colorHex || !v.imageUrl) continue

    if (!map.has(v.color)) {
      map.set(v.color, { colorHex: v.colorHex, imageUrl: v.imageUrl, variants: [] })
    }
    map.get(v.color)!.variants.push(v)
  }
  return Array.from(map.entries()).map(([color, data]) => ({ color, ...data }))
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [liked, setLiked] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authReason, setAuthReason] = useState('')

  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [activeColorIdx, setActiveColorIdx] = useState(0)
  const [loadingVariants, setLoadingVariants] = useState(true)

  useEffect(() => {
    if (!product.id) return
    fetch(`https://nexwearapi-production.up.railway.app/api/products/${product.id}/variants`)
      .then((r) => r.json())
      .then((data: ProductVariant[]) => setVariants(data))
      .catch(() => {}) // silencioso, usa fallback
      .finally(() => setLoadingVariants(false))
  }, [product.id])

  const colorGroups = groupByColor(variants)
  const activeGroup = colorGroups[activeColorIdx]

  // Imagen activa: la de la variante del color seleccionado, o el fallback del producto
  const activeImage = activeGroup?.imageUrl ?? product.imageUrl
  const activeBg = activeGroup?.colorHex ?? '#f2f0ec'

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
    e.stopPropagation()
    requireAuth('Inicia sesión para guardar tus favoritos', () => setLiked((v) => !v))
  }

  const handleSwatchClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    setActiveColorIdx(idx)
  }

  return (
    <article className={styles.card}>
      {/* Image */}
      <div className={styles.imgWrap}>
        <div className={styles.imgInner} style={{ background: activeBg }}>
          <img
            src={activeImage}
            alt={activeGroup ? `${product.name} - ${activeGroup.color}` : product.name}
            className={styles.img}
          />
        </div>
 
        {/* Badges */}
        <div className={styles.badges}>
          {product.isNew && <span className={`${styles.badge} ${styles.new}`}>Nuevo</span>}
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

        {/* Precio: usa finalPrice de la variante activa si existe */}
        <Price
          price={activeGroup?.variants[0]?.finalPrice ?? product.price}
          originalPrice={product.originalPrice}
          size="sm"
        />

        {/* Swatches */}
        {!loadingVariants && colorGroups.length > 0 && (
          <div className={styles.swatches}>
            {colorGroups.slice(0, 5).map((g, i) => (
              <button
                key={g.color}
                className={`${styles.swatch} ${i === activeColorIdx ? styles.swatchActive : ''}`}
                style={{ background: g.colorHex }}
                title={g.color}
                onClick={(e) => handleSwatchClick(e, i)}
                aria-label={`Color ${g.color}`}
              />
            ))}
            {colorGroups.length > 5 && (
              <span className={styles.moreColors}>+{colorGroups.length - 5}</span>
            )}
          </div>
        )}

        {/* Skeleton swatches mientras carga */}
        {loadingVariants && (
          <div className={styles.swatches}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={styles.swatchSkeleton} />
            ))}
          </div>
        )}
      </div>
 
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason={authReason}
      />
    </article>
  )
}

export default ProductCard