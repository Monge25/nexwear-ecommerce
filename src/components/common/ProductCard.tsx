import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Product, ProductVariant } from "@/types";
import Price from "./Price";
import AuthModal from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import styles from "./ProductCard.module.css";
import { useWishlist } from "@/context/WishlistContext";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

function groupByColor(variants: ProductVariant[]) {
  const map = new Map<
    string,
    { colorHex: string; imageUrl: string; variants: ProductVariant[] }
  >();
  for (const v of variants) {
    if (!v.isActive) continue;
    if (!v.color || !v.colorHex || !v.imageUrl) continue;
    if (!map.has(v.color)) {
      map.set(v.color, {
        colorHex: v.colorHex,
        imageUrl: v.imageUrl,
        variants: [],
      });
    }
    map.get(v.color)!.variants.push(v);
  }
  return Array.from(map.entries()).map(([color, data]) => ({ color, ...data }));
}

// ── Modal de selección rápida ─────────────────────────────────────────────────
interface QuickAddModalProps {
  product: Product;
  colorGroups: {
    color: string;
    colorHex: string;
    imageUrl: string;
    variants: ProductVariant[];
  }[];
  onClose: () => void;
  onConfirm: (
    colorName: string,
    colorHex: string,
    size: string,
    qty: number,
    variantImage: string,
  ) => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({
  product,
  colorGroups,
  onClose,
  onConfirm,
}) => {
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const activeGroup = colorGroups[selectedColorIdx];

  // Tallas disponibles para el color seleccionado
  const availableSizes =
    activeGroup?.variants
      .filter((v) => v.isActive && v.stock > 0)
      .map((v) => v.size)
      .filter((s, i, arr) => arr.indexOf(s) === i) ?? [];

  // Reset talla al cambiar color
  useEffect(() => {
    setSelectedSize(null);
  }, [selectedColorIdx]);

  const handleConfirm = () => {
    if (!selectedSize || !activeGroup) return;
    onConfirm(
      activeGroup.color,
      activeGroup.colorHex,
      selectedSize,
      qty,
      activeGroup.imageUrl,
    );
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          zIndex: 1001,
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          padding: "24px 20px 32px",
          maxWidth: 480,
          margin: "0 auto",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.12)",
          animation: "slideUp .25s ease",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>

        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "#e0e0e0",
            margin: "0 auto 20px",
          }}
        />

        {/* Producto mini */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <img
            src={activeGroup?.imageUrl ?? product.imageUrl}
            alt={product.name}
            style={{
              width: 60,
              height: 72,
              objectFit: "cover",
              borderRadius: 8,
              background: "#f5f5f5",
            }}
          />
          <div>
            <p
              style={{
                fontSize: 11,
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: 1,
                margin: "0 0 2px",
              }}
            >
              {product.category}
            </p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                margin: "0 0 4px",
                color: "#0a0a0a",
              }}
            >
              {product.name}
            </p>
            <Price
              price={activeGroup?.variants[0]?.finalPrice ?? product.price}
              originalPrice={product.originalPrice}
              size="sm"
            />
          </div>
        </div>

        {/* Colores */}
        {colorGroups.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "#555",
                marginBottom: 8,
              }}
            >
              Color —{" "}
              <span
                style={{
                  fontWeight: 400,
                  textTransform: "none",
                  color: "#0a0a0a",
                }}
              >
                {activeGroup?.color}
              </span>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {colorGroups.map((g, i) => (
                <button
                  key={g.color}
                  onClick={() => setSelectedColorIdx(i)}
                  title={g.color}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: g.colorHex,
                    border:
                      i === selectedColorIdx
                        ? "2px solid #0a0a0a"
                        : "2px solid transparent",
                    outline:
                      i === selectedColorIdx
                        ? "2px solid #0a0a0a"
                        : "1px solid #d0d0d0",
                    outlineOffset: 2,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tallas */}
        <div style={{ marginBottom: 18 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "#555",
              marginBottom: 8,
            }}
          >
            Talla{" "}
            {!selectedSize && (
              <span style={{ color: "#e53935", fontWeight: 400 }}>
                — Selecciona una
              </span>
            )}
          </p>
          {availableSizes.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {availableSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s ?? null)}
                  style={{
                    minWidth: 44,
                    height: 44,
                    padding: "0 12px",
                    border:
                      selectedSize === s
                        ? "2px solid #0a0a0a"
                        : "1px solid #d0d0d0",
                    borderRadius: 8,
                    background: selectedSize === s ? "#0a0a0a" : "#fff",
                    color: selectedSize === s ? "#fff" : "#0a0a0a",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#999" }}>
              Sin tallas disponibles para este color
            </p>
          )}
        </div>

        {/* Cantidad */}
        <div style={{ marginBottom: 22 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "#555",
              marginBottom: 8,
            }}
          >
            Cantidad
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              width: "fit-content",
              border: "1px solid #d0d0d0",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{
                width: 40,
                height: 40,
                border: "none",
                background: "#f5f5f5",
                fontSize: 18,
                cursor: "pointer",
                color: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <span
              style={{
                width: 40,
                textAlign: "center",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              style={{
                width: 40,
                height: 40,
                border: "none",
                background: "#f5f5f5",
                fontSize: 18,
                cursor: "pointer",
                color: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Botón confirmar */}
        <button
          onClick={handleConfirm}
          disabled={!selectedSize}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 10,
            border: "none",
            background: selectedSize ? "#0a0a0a" : "#d0d0d0",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: selectedSize ? "pointer" : "not-allowed",
            transition: "background .2s",
            letterSpacing: 0.5,
          }}
        >
          {selectedSize
            ? `Añadir a la Bolsa — ${qty} pieza${qty > 1 ? "s" : ""}`
            : "Selecciona una talla"}
        </button>
      </div>
    </>
  );
};

// ── ProductCard ───────────────────────────────────────────────────────────────
const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();

  const liked = has(String(product.id));

  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [loadingVariants, setLoadingVariants] = useState(true);

  useEffect(() => {
    if (!product.id) return;
    fetch(
      `https://nexwearapi-production.up.railway.app/api/products/${product.id}/variants`,
    )
      .then((r) => r.json())
      .then((data: ProductVariant[]) => setVariants(data))
      .catch(() => {})
      .finally(() => setLoadingVariants(false));
  }, [product.id]);

  const colorGroups = groupByColor(variants);
  const activeGroup = colorGroups[activeColorIdx];
  const activeImage = activeGroup?.imageUrl ?? product.imageUrl;
  const activeBg = activeGroup?.colorHex ?? "#f2f0ec";

  const requireAuth = (reason: string, action: () => void) => {
    if (!isAuthenticated) {
      setAuthReason(reason);
      setAuthOpen(true);
    } else {
      action();
    }
  };

  const handleNavigate = () => navigate(`/productos/${product.slug}`);

  // Abre el modal de selección rápida (requiere auth)
  const handleAddToCart = () =>
    requireAuth("Inicia sesión para añadir productos a tu bolsa", () =>
      setQuickAddOpen(true),
    );

  // Confirmar desde el modal — agrega con talla, color, cantidad e imagen de variante correctos
  const handleQuickAddConfirm = (
    colorName: string,
    colorHex: string,
    size: string,
    qty: number,
    variantImage: string,
  ) => {
    addItem(
      product,
      qty,
      size as never,
      { name: colorName, hex: colorHex },
      variantImage,
    );
    onAddToCart?.(product);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth("Inicia sesión para guardar tus favoritos", () =>
      toggle({ ...product, id: String(product.id) }),
    );
  };

  const handleSwatchClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setActiveColorIdx(idx);
  };

  return (
    <>
      <article className={styles.card}>
        {/* Image */}
        <div className={styles.imgWrap}>
          <div className={styles.imgInner} style={{ background: activeBg }}>
            <img
              src={activeImage}
              alt={
                activeGroup
                  ? `${product.name} - ${activeGroup.color}`
                  : product.name
              }
              className={styles.img}
            />
          </div>

          {/* Badges */}
          <div className={styles.badges}>
            {product.isNew && (
              <span className={`${styles.badge} ${styles.new}`}>Nuevo</span>
            )}
            {product.isSale && product.originalPrice && (
              <span className={`${styles.badge} ${styles.sale}`}>
                -{Math.round((1 - product.price / product.originalPrice) * 100)}
                %
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
            {product.category.charAt(0).toUpperCase() +
              product.category.slice(1)}
          </p>
          <h3 className={styles.name} onClick={handleNavigate}>
            {product.name}
          </h3>

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
                  className={`${styles.swatch} ${i === activeColorIdx ? styles.swatchActive : ""}`}
                  style={{ background: g.colorHex }}
                  title={g.color}
                  onClick={(e) => handleSwatchClick(e, i)}
                  aria-label={`Color ${g.color}`}
                />
              ))}
              {colorGroups.length > 5 && (
                <span className={styles.moreColors}>
                  +{colorGroups.length - 5}
                </span>
              )}
            </div>
          )}

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

      {/* Modal de selección rápida — fuera del article para evitar z-index issues */}
      {quickAddOpen && (
        <QuickAddModal
          product={product}
          colorGroups={colorGroups}
          onClose={() => setQuickAddOpen(false)}
          onConfirm={handleQuickAddConfirm}
        />
      )}
    </>
  );
};

export default ProductCard;
