import React, { useState, useMemo, useRef } from "react";
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

// ── Acordeón ──────────────────────────────────────────────────
const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, children, defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.accordion}>
      <button className={styles.accordionBtn} onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <span className={`${styles.accordionIcon} ${open ? styles.accordionIconOpen : ""}`}>+</span>
      </button>
      {open && <div className={styles.accordionBody}>{children}</div>}
    </div>
  );
};

// ── Modal guía de tallas ──────────────────────────────────────
const SizeGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>Guía de Tallas</h3>
        <button className={styles.modalClose} onClick={onClose}>✕</button>
      </div>
      <table className={styles.sizeTable}>
        <thead>
          <tr><th>Talla</th><th>Pecho (cm)</th><th>Cintura (cm)</th><th>Cadera (cm)</th></tr>
        </thead>
        <tbody>
          {[
            ["XS", "80–84", "60–64", "86–90"],
            ["S",  "84–88", "64–68", "90–94"],
            ["M",  "88–92", "68–72", "94–98"],
            ["L",  "92–96", "72–76", "98–102"],
            ["XL", "96–100","76–80","102–106"],
            ["XXL","100–104","80–84","106–110"],
          ].map(([t, p, c, ca]) => (
            <tr key={t}><td>{t}</td><td>{p}</td><td>{c}</td><td>{ca}</td></tr>
          ))}
        </tbody>
      </table>
      <p className={styles.sizeNote}>
        Si estás entre dos tallas, te recomendamos elegir la talla mayor.
      </p>
    </div>
  </div>
);

const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { has, toggle } = useWishlist();

  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({});

  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [adding, setAdding]           = useState(false);
  const [authOpen, setAuthOpen]       = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [copied, setCopied]           = useState(false);

  const reviewsRef = useRef<HTMLDivElement>(null)

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
  const hasVariants  = uniqueColors.length > 0;

  if (loading) return <Loader fullPage />;
  if (!product)
    return (
      <div className={styles.notFound}>
        Producto no encontrado.
        <button onClick={() => navigate("/productos")}>Volver</button>
      </div>
    );

  const selectedColor = activeColor ?? uniqueColors[0] ?? null;
  const colorVariants = selectedColor
    ? (colorGroups.get(selectedColor) ?? [])
    : [];
  const sizesForColor: string[] = colorVariants
    .map((v) => v.size)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  const matchedVariant =
    selectedColor && activeSize
      ? (colorVariants.find((v) => v.size === activeSize) ?? null)
      : null;

  const displayImage = colorVariants[0]?.imageUrl || product.imageUrl || "";
  const selectedVariant = matchedVariant ?? colorVariants[0];

  const displayPrice = selectedVariant?.finalPrice ?? product.price;

  const displayOriginalPrice =
    selectedVariant &&
    selectedVariant.finalPrice &&
    selectedVariant.finalPrice < product.price
      ? product.price
      : undefined;
  const displayStock =
    matchedVariant?.stock ?? colorVariants[0]?.stock ?? product.stock ?? 0;
  const displaySizes: string[] =
    sizesForColor.length > 0
      ? sizesForColor
      : Array.isArray(product.sizes) && product.sizes.length > 0
        ? (product.sizes as string[])
        : [];

  const variantHex = colorVariants[0]?.colorHex;
  const productHex =
    Array.isArray(product.colors) && product.colors.length > 0
      ? product.colors[0].hex
      : undefined;
  const selectedHex = variantHex ?? productHex ?? "#f5f5f5";

  const baseColors: ProductColor[] =
    Array.isArray(product.colors) && product.colors.length > 0
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
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }

    // ❌ Sin stock
    if (displayStock <= 0) {
      return;
    }

    // ❌ Cantidad mayor al stock
    if (quantity > displayStock) {
      setQuantity(displayStock);
      return;
    }

    if (displaySizes.length > 0 && !activeSize) {
      setSizeError(true);
      return;
    }

    setSizeError(false);
    setAdding(true);

    const color: ProductColor = selectedColor
      ? { name: selectedColor, hex: selectedHex }
      : baseColors[0];

    const size: Size = activeSize ?? (displaySizes[0] as Size) ?? "M";

    addItem(
      {
        ...product,
        price: displayPrice,
        imageUrl: displayImage,
        stock: displayStock,
      },
      quantity,
      size,
      color,
    );

    setTimeout(() => setAdding(false), 600);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  // Breadcrumb clickeable
  const breadcrumbs = [
    { label: "Inicio", path: "/" },
    {
      label:
        product.category.charAt(0).toUpperCase() + product.category.slice(1),
      path: `/productos?category=${product.category}`,
    },
    { label: product.name, path: null },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* ── Galería ── */}
        <div className={styles.gallery}>
          <div
            className={styles.mainImg}
            style={{ background: selectedHex }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();

              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              setZoomStyle({
                left: x,
                top: y,
                backgroundPosition: `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`,
              });
            }}
            onMouseEnter={() => setZoomVisible(true)}
            onMouseLeave={() => setZoomVisible(false)}
          >
            {displayImage && (
              <>
                <img
                  src={displayImage}
                  alt={product.name}
                  className={styles.productImg}
                />

                <div
                  className={`${styles.zoom} ${
                    zoomVisible ? styles.zoomVisible : ""
                  }`}
                  style={{
                    backgroundImage: `url(${displayImage})`,
                    ...zoomStyle,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* ── Info ── */}
        <div className={styles.info}>
          {/* Breadcrumb clickeable */}
          <nav className={styles.breadcrumbs}>
            {breadcrumbs.map((b, i) => (
              <span key={i}>
                {b.path ? (
                  <button
                    className={styles.breadcrumbLink}
                    onClick={() => navigate(b.path!)}
                  >
                    {b.label}
                  </button>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <span className={styles.breadcrumbSep}>/</span>
                )}
              </span>
            ))}
          </nav>

          <div className={styles.nameRow}>
            <h1 className={styles.name}>{product.name}</h1>
            {/* Botón compartir */}
            <button
              className={styles.shareBtn}
              onClick={handleShare}
              title="Compartir"
            >
              {copied ? (
                <span className={styles.copiedMsg}>¡Copiado!</span>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              )}
            </button>
          </div>

          <div className={styles.priceRow}>
            <Price
              price={displayPrice}
              originalPrice={displayOriginalPrice}
              size="lg"
            />
          </div>

          {/* Rating clickeable → scroll a reseñas */}
          <button
            onClick={() =>
              reviewsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: 28, // ← separación antes del color
            }}
          >
            <Rating
              value={product.rating}
              count={product.reviewCount}
              size="md"
            />
            {product.reviewCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--dorado)",
                  letterSpacing: "0.1em",
                  textDecoration: "underline",
                }}
              >
                Ver reseñas
              </span>
            )}
          </button>

          {/* Separador visual */}
          <div
            style={{ height: 1, background: "var(--g100)", marginBottom: 22 }}
          />

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
                <p className={styles.optLabel}>
                  Color — <span>{baseColors[0].name}</span>
                </p>
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
              <button
                className={styles.guideLink}
                onClick={() => setSizeGuideOpen(true)}
              >
                Guía de tallas →
              </button>
            </p>
            {displaySizes.length > 0 ? (
              <div className={styles.sizes}>
                {displaySizes.map((s) => (
                  <button
                    key={s}
                    className={`${styles.sizeBtn} ${activeSize === s ? styles.sizeOn : ""}`}
                    onClick={() => {
                      setActiveSize(s as Size);
                      setSizeError(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--g400, #9a9a9a)" }}>
                Talla única
              </p>
            )}
            {sizeError && (
              <p className={styles.sizeError}>Por favor selecciona una talla</p>
            )}
          </div>

          {/* ── Cantidad ── */}
          <div className={styles.optSection}>
            <p className={styles.optLabel}>Cantidad</p>
            <div className={styles.qtyRow}>
              <button
                className={styles.qtyBtn}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>

              <span className={styles.qtyNum}>{quantity}</span>

              <button
                className={styles.qtyBtn}
                onClick={() =>
                  setQuantity((q) => Math.min(displayStock, q + 1))
                }
                disabled={quantity >= displayStock || displayStock <= 0}
              >
                +
              </button>
            </div>
          </div>

          {/* Stock bajo */}
          {displayStock > 0 && displayStock <= 5 && (
            <p className={styles.lowStock}>
              ¡Solo quedan {displayStock} unidades!
            </p>
          )}

          {/* Sin stock */}
          {displayStock <= 0 && (
            <p className={styles.outOfStock}>Producto agotado</p>
          )}

          {/* Badges de confianza */}
          <div className={styles.trustBadges}>
            <span className={styles.trustBadge}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Pago seguro
            </span>
            <span className={styles.trustBadge}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Devolución 30 días
            </span>
            <span className={styles.trustBadge}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              Envío gratis +$150
            </span>
          </div>

          {/* CTAs */}
          <div className={styles.ctas}>
            <Button
              variant="fill"
              size="lg"
              fullWidth
              loading={adding}
              disabled={displayStock <= 0}
              onClick={handleAdd}
            >
              {displayStock <= 0 ? "Agotado" : "Añadir a la Bolsa"}
            </Button>
            <button
              className={`${styles.wishBtn} ${liked ? styles.wishBtnOn : ""}`}
              aria-label="Favorito"
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthOpen(true);
                  return;
                }
                toggle(product);
              }}
            >
              {liked ? "♥" : "♡"}
            </button>
          </div>

          {/* Envío */}
          <div className={styles.shippingBox}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--verde, #1e5c38)"
              strokeWidth="1.5"
            >
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

          {/* ── Acordeón de detalles ── */}
          <div className={styles.accordions}>
            <Accordion title="Descripción" defaultOpen>
              <p className={styles.accordionText}>
                {product.description || "Sin descripción disponible."}
              </p>
            </Accordion>

            {(product.material || product.care || product.origin) && (
              <Accordion title="Materiales y cuidados">
                <div className={styles.accordionDetails}>
                  {product.material && (
                    <div className={styles.detRow}>
                      <span className={styles.detKey}>Material</span>
                      <span>{product.material}</span>
                    </div>
                  )}
                  {product.care && (
                    <div className={styles.detRow}>
                      <span className={styles.detKey}>Cuidado</span>
                      <span>{product.care}</span>
                    </div>
                  )}
                  {product.origin && (
                    <div className={styles.detRow}>
                      <span className={styles.detKey}>Origen</span>
                      <span>{product.origin}</span>
                    </div>
                  )}
                </div>
              </Accordion>
            )}

            <Accordion title="Envíos y devoluciones">
              <div className={styles.accordionText}>
                <p>
                  • Envío gratis en pedidos superiores a{" "}
                  <strong>$150 MXN</strong>.
                </p>
                <p>
                  • Entrega estimada en <strong>2–4 días hábiles</strong>.
                </p>
                <p>
                  • Devoluciones gratuitas dentro de los{" "}
                  <strong>30 días</strong> posteriores a la compra.
                </p>
                <p>
                  • El producto debe estar sin usar, con etiquetas originales.
                </p>
              </div>
            </Accordion>

            {displayStock > 0 && (
              <Accordion title="Disponibilidad">
                <p className={styles.accordionText}>
                  {displayStock <= 5
                    ? `⚠️ Quedan pocas unidades — solo ${displayStock} en stock.`
                    : `✓ En stock — ${displayStock} unidades disponibles.`}
                </p>
              </Accordion>
            )}
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {relatedProducts.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relTitle}>
            También te puede <em>gustar</em>
          </h2>
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

      <div
        ref={reviewsRef}
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "0 52px",
          scrollMarginTop: "calc(var(--nav-h) + 20px)", // ← offset del navbar
        }}
      >
        <ReviewSection productId={product.id} />
      </div>

      {sizeGuideOpen && (
        <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />
      )}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason="Inicia sesión para continuar"
      />
    </div>
  );
};

export default ProductDetail;