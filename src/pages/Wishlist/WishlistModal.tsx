import React, { useState, useEffect } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/utils/formatPrice";
import Price from "@/components/common/Price";
import type { Product, ProductVariant, Size } from "@/types";
import styles from "./Wishlist.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupByColor(variants: ProductVariant[]) {
  const map = new Map<
    string,
    { colorHex: string; imageUrl: string; variants: ProductVariant[] }
  >();
  for (const v of variants) {
    if (!v.isActive || !v.color || !v.colorHex || !v.imageUrl) continue;
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

// ── QuickAddModal ─────────────────────────────────────────────────────────────
interface QuickAddModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (
    colorName: string,
    colorHex: string,
    size: string,
    qty: number,
    variantImage: string,
    allVariants: ProductVariant[], // ✅ pasamos todas las variantes
  ) => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({
  product,
  onClose,
  onConfirm,
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    fetch(
      `https://nexwearapi-production.up.railway.app/api/products/${product.id}/variants`,
    )
      .then((r) => r.json())
      .then((data: ProductVariant[]) => setVariants(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [product.id]);

  const colorGroups = groupByColor(variants);
  const activeGroup = colorGroups[selectedColorIdx];

  const availableSizes =
    activeGroup?.variants
      .filter((v) => v.isActive && v.stock > 0)
      .map((v) => v.size)
      .filter((s, i, arr) => arr.indexOf(s) === i) ?? [];

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
      variants, // asamos todas las variantes fetched
    );
    onClose();
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1100,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          zIndex: 1101,
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

        {loading && (
          <p
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            Cargando variantes…
          </p>
        )}

        {/* Colores */}
        {!loading && colorGroups.length > 0 && (
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
        {!loading && (
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
        )}

        {/* Cantidad */}
        {!loading && (
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
        )}

        <button
          onClick={handleConfirm}
          disabled={!selectedSize || loading}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 10,
            border: "none",
            background: selectedSize && !loading ? "#0a0a0a" : "#d0d0d0",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: selectedSize && !loading ? "pointer" : "not-allowed",
            transition: "background .2s",
            letterSpacing: 0.5,
          }}
        >
          {loading
            ? "Cargando…"
            : selectedSize
              ? `Añadir a la Bolsa — ${qty} pieza${qty > 1 ? "s" : ""}`
              : "Selecciona una talla"}
        </button>
      </div>
    </>
  );
};

// ── WishlistModal ─────────────────────────────────────────────────────────────
const WishlistModal: React.FC = () => {
  const { items, isOpen, closeWishlist, toggle } = useWishlist();
  const { addItem } = useCart();
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);

  const handleShare = async () => {
    const ids = items.map((i) => i.id).join(",");
    const shareUrl = `${window.location.origin}/wishlist?items=${ids}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mi Wishlist Nexwear",
          text: "Mira mis favoritos en Nexwear",
          url: shareUrl,
        });
      } catch {
        /* cancelado */
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Wishlist copiada al portapapeles");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={closeWishlist} />

      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Favoritos</h2>
            <span className={styles.count}>{items.length} ARTÍCULOS</span>
          </div>
          <div className={styles.headerActions}>
            {items.length > 0 && (
              <button className={styles.share} onClick={handleShare}>
                Compartir
              </button>
            )}
            <button className={styles.close} onClick={closeWishlist}>
              ✕
            </button>
          </div>
        </div>

        <div className={styles.items}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemImg}>
                <img src={item.imageUrl} alt={item.name} />
              </div>
              <div className={styles.itemInfo}>
                <h4 className={styles.itemName}>{item.name}</h4>
                <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                <button
                  className={styles.add}
                  onClick={() => setQuickAddProduct(item as unknown as Product)}
                >
                  AÑADIR A BOLSA
                </button>
                <button className={styles.remove} onClick={() => toggle(item)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className={styles.empty}>No tienes favoritos aún</div>
        )}
      </div>

      {quickAddProduct && (
        <QuickAddModal
          product={quickAddProduct}
          onClose={() => setQuickAddProduct(null)}
          onConfirm={(
            colorName,
            colorHex,
            size,
            qty,
            variantImage,
            allVariants,
          ) => {
            // Pasamos el producto con todas las variantes para que CartContext encuentre el variantId
            addItem(
              { ...quickAddProduct, variants: allVariants },
              qty,
              size as Size,
              { name: colorName, hex: colorHex },
              variantImage,
            );
            setQuickAddProduct(null);
          }}
        />
      )}
    </>
  );
};

export default WishlistModal;
