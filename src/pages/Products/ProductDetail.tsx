import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import productService from "@/services/productService";
import { useFetch } from "@/hooks/useFetch";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/context/WishlistContext";
import Button from "@/components/ui/Button";
import Rating from "@/components/common/Rating";
import Price from "@/components/common/Price";
import ProductCard from "@/components/common/ProductCard";
import ReviewSection from "@/components/common/ReviewSection";
import AuthModal from "@/components/common/AuthModal";
import Loader from "@/components/ui/Loader";
import type { Size, ProductColor, ProductVariant } from "@/types";
import styles from "./ProductDetail.module.css";

const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { has, toggle } = useWishlist();

  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<Size | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const { data: product, loading } = useFetch(
    () => productService.getProductBySlug(slug!),
    [slug],
  );

  const { data: rawVariants = [] } = useFetch(
    () => product ? productService.getVariants(product.id) : Promise.resolve([]),
    [product?.id],
  );

  const { data: related } = useFetch(
    () => product ? productService.getRelated(product.id) : Promise.resolve([]),
    [product?.id],
  );

  // Agrupa variantes activas por color
  const colorGroups = useMemo(() => {
    const map = new Map<string, ProductVariant[]>();
    for (const v of rawVariants ?? []) {
      if (!v.isActive) continue;
      const colorKey = v.color ?? "Sin color";
      if (!map.has(colorKey)) map.set(colorKey, []);
      map.get(colorKey)!.push(v);
    }
    return map;
  }, [rawVariants]);

  const uniqueColors = useMemo(() => Array.from(colorGroups.keys()), [colorGroups]);
  const hasVariants = uniqueColors.length > 0;

  if (loading) return <Loader fullPage />;
  if (!product)
    return (
      <div className={styles.notFound}>
        Producto no encontrado.
        <button onClick={() => navigate("/productos")}>Volver</button>
      </div>
    );

  const selectedColor = activeColor ?? uniqueColors[0] ?? null;
  const colorVariants = selectedColor ? (colorGroups.get(selectedColor) ?? []) : [];

  // v.size es opcional → filtramos undefined explícitamente
  const sizesForColor: string[] = colorVariants
    .map((v) => v.size)
    .filter((s): s is string => typeof s === "string" && s.length > 0);

  const matchedVariant = selectedColor && activeSize
    ? (colorVariants.find((v) => v.size === activeSize) ?? null)
    : null;

  const displayImage         = colorVariants[0]?.imageUrl    || product.imageUrl || "";
  const displayPrice         = matchedVariant?.finalPrice     ?? colorVariants[0]?.finalPrice ?? product.price;
  const displayOriginalPrice = product.originalPrice !== undefined
    ? product.originalPrice
    : (colorVariants[0]?.priceModifier ?? 0) < 0 ? product.price : undefined;
  const displayStock         = matchedVariant?.stock ?? colorVariants[0]?.stock ?? product.stock ?? 0;
  const displaySizes: string[] = sizesForColor.length > 0
    ? sizesForColor
    : Array.isArray(product.sizes) && product.sizes.length > 0
      ? (product.sizes as string[])
      : [];

  // selectedHex: evita que ?? reciba false
  const variantHex   = colorVariants[0]?.colorHex;
  const productHex   = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors[0].hex
    : undefined;
  const selectedHex  = variantHex ?? productHex ?? "#f5f5f5";

  const baseColors: ProductColor[] = Array.isArray(product.colors) && product.colors.length > 0
    ? (product.colors as ProductColor[])
    : [{ name: "Negro", hex: "#0a0a0a" }];

  const liked = isAuthenticated ? has(product.id) : false;
  const relatedProducts = Array.isArray(related) ? related : [];

  const handleSelectColor = (color: string) => {
    setActiveColor(color);
    setActiveSize(null);
    setSizeError(false);
  };

  const handleAdd = async () => {
    if (!isAuthenticated) { setAuthOpen(true); return; }
    if (displaySizes.length > 0 && !activeSize) { setSizeError(true); return; }
    setSizeError(false);
    setAdding(true);
    const color: ProductColor = selectedColor
      ? { name: selectedColor, hex: selectedHex }
      : baseColors[0];
    const size: Size = activeSize ?? (displaySizes[0] as Size) ?? "M";
    addItem({ ...product, price: displayPrice, imageUrl: displayImage }, 1, size, color);
    setTimeout(() => setAdding(false), 600);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* ── Galería ── */}
        <div className={styles.gallery}>
          <div className={styles.mainImg} style={{ background: selectedHex }}>
            {displayImage ? (
              <img src={displayImage} alt={product.name} className={styles.productImg} />
            ) : (
              <div className={styles.imgPlaceholder}><span>NEXWEAR</span></div>
            )}
          </div>

          {/* Miniaturas por color */}
          {hasVariants && uniqueColors.length > 1 && (
            <div className={styles.thumbs}>
              {uniqueColors.map((colorName) => {
                const first = colorGroups.get(colorName)![0];
                const isOn = selectedColor === colorName;
                return (
                  <button
                    key={colorName}
                    className={`${styles.thumb} ${isOn ? styles.thumbOn : ""}`}
                    onClick={() => handleSelectColor(colorName)}
                    title={colorName}
                  >
                    {first.imageUrl ? (
                      <img src={first.imageUrl} alt={colorName} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: first.colorHex ?? "#888" }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className={styles.info}>
          <p className={styles.breadcrumb}>
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </p>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.priceRow}>
            <Price price={displayPrice} originalPrice={displayOriginalPrice} size="lg" />
          </div>

          <Rating value={product.rating} count={product.reviewCount} size="md" />
          <p className={styles.desc}>{product.description}</p>

          {/* ── Selector de color ── */}
          {hasVariants ? (
            <div className={styles.optSection}>
              <p className={styles.optLabel}>
                Color — <span>{selectedColor}</span>
              </p>
              <div className={styles.swatches}>
                {uniqueColors.map((colorName) => {
                  const first = colorGroups.get(colorName)![0];
                  const isOn = selectedColor === colorName;
                  return (
                    <button
                      key={colorName}
                      className={`${styles.swatch} ${isOn ? styles.swatchActive : ""}`}
                      style={{ background: first.colorHex ?? "#888" }}
                      title={colorName}
                      onClick={() => handleSelectColor(colorName)}
                      aria-label={`Color ${colorName}`}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            baseColors.length > 1 && (
              <div className={styles.optSection}>
                <p className={styles.optLabel}>Color — <span>{baseColors[0].name}</span></p>
                <div className={styles.swatches}>
                  {baseColors.map((c) => (
                    <button
                      key={c.name}
                      className={styles.swatch}
                      style={{ background: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )
          )}

          {/* ── Tallas ── */}
          <div className={styles.optSection}>
            <p className={styles.optLabel}>
              Talla
              <a href="#" className={styles.guideLink}>Guía de tallas →</a>
            </p>
            {displaySizes.length > 0 ? (
              <div className={styles.sizes}>
                {displaySizes.map((s) => (
                  <button
                    key={s}
                    className={`${styles.sizeBtn} ${activeSize === s ? styles.sizeOn : ""}`}
                    onClick={() => { setActiveSize(s as Size); setSizeError(false); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--g400, #9a9a9a)" }}>Talla única</p>
            )}
            {sizeError && <p className={styles.sizeError}>Por favor selecciona una talla</p>}
          </div>

          {displayStock > 0 && displayStock <= 5 && (
            <p className={styles.lowStock}>¡Solo quedan {displayStock} unidades!</p>
          )}

          <div className={styles.ctas}>
            <Button variant="fill" size="lg" fullWidth loading={adding} onClick={handleAdd}>
              Añadir a la Bolsa
            </Button>
            <button
              className={`${styles.wishBtn} ${liked ? styles.wishBtnOn : ""}`}
              aria-label="Favorito"
              onClick={() => { if (!isAuthenticated) { setAuthOpen(true); return; } toggle(product); }}
            >
              {liked ? "♥" : "♡"}
            </button>
          </div>

          <div className={styles.shippingBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--verde, #1e5c38)" strokeWidth="1.5">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
              <rect x="9" y="11" width="14" height="10" rx="1" />
              <circle cx="12" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
            </svg>
            <p>
              <strong>Envío gratis</strong> en pedidos superiores a $150.
              Entrega en <strong>2–4 días hábiles</strong>.
            </p>
          </div>

          <div className={styles.details}>
            {(
              [
                ["Material", product.material],
                ["Cuidado", product.care],
                ["Origen", product.origin],
                ["Stock", displayStock ? `${displayStock} unidades` : null],
              ] as [string, string | number | null | undefined][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={String(k)} className={styles.detRow}>
                  <span className={styles.detKey}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
          </div>
        </div>

      </div>

      {relatedProducts.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relTitle}>También te puede <em>gustar</em></h2>
          <div className={styles.relGrid}>
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(prod) =>
                  addItem(
                    prod,
                    1,
                    (prod.sizes?.[0] as Size) ?? "M",
                    prod.colors?.[0] ?? { name: "Negro", hex: "#0a0a0a" },
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 52px" }}>
        <ReviewSection productId={product.id} />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} reason="Inicia sesión para continuar" />
    </div>
  );
};

export default ProductDetail;