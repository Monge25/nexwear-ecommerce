import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import productService from "@/services/productService";
import { useFetch } from "@/hooks/useFetch";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Rating from "@/components/common/Rating";
import Price from "@/components/common/Price";
import ProductCard from "@/components/common/ProductCard";
import ReviewSection from "@/components/common/ReviewSection";
import AuthModal from "@/components/common/AuthModal";
import Loader from "@/components/ui/Loader";
import type { Size, ProductColor } from "@/types";
import styles from "./ProductDetail.module.css";

const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [activeImg, setActiveImg] = useState(0);
  const [activeColor, setColor] = useState<ProductColor | null>(null);
  const [activeSize, setSize] = useState<Size | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [adding, setAdding] = useState(false);

  const { data: product, loading } = useFetch(
    () => productService.getProductBySlug(slug!),
    [slug],
  );
  const { data: related } = useFetch(
    () =>
      product ? productService.getRelated(product.id) : Promise.resolve([]),
    [product?.id],
  );

  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) return <Loader fullPage />;
  if (!product)
    return (
      <div className={styles.notFound}>
        Producto no encontrado.
        <button onClick={() => navigate("/productos")}>Volver</button>
      </div>
    );

  const selectedColor = activeColor ?? product.colors[0];

  const handleAdd = async () => {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    if (!activeSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    setAdding(true);
    addItem(product, 1, activeSize, selectedColor);
    setTimeout(() => setAdding(false), 600);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Gallery */}
        <div className={styles.gallery}>
          <div
            className={styles.mainImg}
            style={{ background: selectedColor.hex }}
          >
            {product.imageUrl[activeImg] ? (
                <img src={product.imageUrl[activeImg]} alt={product.name} />
            ) : (
              <div className={styles.imgPlaceholder}>
                <span>NEXWEAR</span>
              </div>
            )}
          </div>
          <div className={styles.thumbs}>
            {(product.imageUrl.length > 0 ? product.imageUrl : ["", "", ""]).map(
              (img, i) => (
                <button
                  key={i}
                  className={`${styles.thumb} ${activeImg === i ? styles.thumbOn : ""}`}
                  onClick={() => setActiveImg(i)}
                >
                  {img ? (
                    <img src={img} alt="" />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background:
                          product.colors[i % product.colors.length]?.hex ??
                          selectedColor.hex,
                      }}
                    />
                  )}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Info */}
        <div className={styles.info}>
          <p className={styles.breadcrumb}>
            {product.category.charAt(0).toUpperCase() +
              product.category.slice(1)}
          </p>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.priceRow}>
            <Price
              price={product.price}
              originalPrice={product.originalPrice}
              size="lg"
            />
          </div>
          <Rating
            value={product.rating}
            count={product.reviewCount}
            size="md"
          />

          <p className={styles.desc}>{product.description}</p>

          {/* Color */}
          <div className={styles.optSection}>
            <p className={styles.optLabel}>
              Color — <span>{selectedColor.name}</span>
            </p>
            <div className={styles.colors}>
              {product.colors.map((c, i) => (
                <button
                  key={c.name}
                  className={`${styles.colorBtn} ${(activeColor?.name ?? product.colors[0].name) === c.name ? styles.colorOn : ""}`}
                  style={{ background: c.hex }}
                  title={c.name}
                  onClick={() => {
                    setColor(c);
                    setActiveImg(i);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div className={styles.optSection}>
            <p className={styles.optLabel}>
              Talla
              <a href="#" className={styles.guideLink}>
                Guía de tallas →
              </a>
            </p>
            <div className={styles.sizes}>
              {product.sizes.map((s) => (
                <button
                  key={s}
                  className={`${styles.sizeBtn} ${activeSize === s ? styles.sizeOn : ""}`}
                  onClick={() => {
                    setSize(s);
                    setSizeError(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {sizeError && (
              <p className={styles.sizeError}>Por favor selecciona una talla</p>
            )}
          </div>

          {/* CTA */}
          <div className={styles.ctas}>
            <Button
              variant="fill"
              size="lg"
              fullWidth
              loading={adding}
              onClick={handleAdd}
            >
              Añadir a la Bolsa
            </Button>
            <button className={styles.wishBtn} aria-label="Favorito">
              ♡
            </button>
          </div>

          {/* Shipping */}
          <div className={styles.shippingBox}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--verde)"
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

          {/* Details */}
          <div className={styles.details}>
            {[
              ["Material", product.material],
              ["Cuidado", product.care],
              ["Origen", product.origin],
              ["Stock", `${product.stock} unidades`],
            ].map(([k, v]) => (
              <div key={k} className={styles.detRow}>
                <span className={styles.detKey}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relTitle}>
            También te puede <em>gustar</em>
          </h2>
          <div className={styles.relGrid}>
            {related.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(prod) =>
                  addItem(prod, 1, prod.sizes[0], prod.colors[0])
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "0 52px",
        }}
      >
        <ReviewSection productId={product.id} />
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason="Inicia sesión para añadir a tu bolsa"
      />
    </div>
  );
};

export default ProductDetail;
