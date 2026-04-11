import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/utils/formatPrice";
import Button from "@/components/ui/Button";
import styles from "./Cart.module.css";

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    subtotal,
    shipping,
    total,
    freeShippingRemaining,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className={styles.emptyPage}>
        <svg
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <h1>Tu bolsa está vacía</h1>
        <p>Descubre nuestras últimas colecciones</p>
        <Button onClick={() => navigate("/productos")}>Explorar Tienda</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.header}>
            <h1 className={styles.title}>Tu Bolsa</h1>
            <button className={styles.clearAll} onClick={clearCart}>
              Vaciar bolsa
            </button>
          </div>

          {items.map((item) => {
            const displayImage = item.variantImage ?? item.product.imageUrl;

            // ✅ Calcular stock disponible para esta variante
            const variant = item.product.variants?.find(
              (v) =>
                v.color === item.selectedColor.name &&
                v.size === item.selectedSize,
            );
            const maxStock = variant?.stock ?? item.product.stock ?? Infinity;
            const outOfStock = maxStock === 0;
            const atLimit = item.quantity >= maxStock;

            return (
              <div
                key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
                className={`${styles.item} ${outOfStock ? styles.itemOutOfStock : ""}`}
              >
                <div
                  className={styles.itemImg}
                  style={{ background: item.selectedColor.hex + "22" }}
                >
                  {displayImage && (
                    <img src={displayImage} alt={item.product.name} />
                  )}
                  {/* ✅ Overlay "Sin stock" sobre la imagen */}
                  {outOfStock && (
                    <div className={styles.outOfStockOverlay}>Sin stock</div>
                  )}
                </div>

                <div className={styles.itemInfo}>
                  <Link
                    to={`/productos/${item.product.slug}`}
                    className={styles.itemName}
                  >
                    {item.product.name}
                  </Link>

                  <p className={styles.itemMeta}>
                    Talla: <strong>{item.selectedSize}</strong>
                    {" · "}
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: item.selectedColor.hex,
                        border: "1px solid rgba(0,0,0,0.15)",
                        marginRight: 4,
                        verticalAlign: "middle",
                      }}
                    />
                    <strong>{item.selectedColor.name}</strong>
                  </p>

                  <p className={styles.itemMeta}>
                    {formatPrice(item.product.price)} por unidad
                  </p>

                  {/* ✅ Controles de cantidad con límite de stock */}
                  {outOfStock ? (
                    <p className={styles.stockWarning}>
                      ⚠ Este producto ya no está disponible
                    </p>
                  ) : (
                    <div className={styles.qty}>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.selectedSize,
                            item.selectedColor.name,
                            item.quantity - 1,
                          )
                        }
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        // ✅ Deshabilitado si ya se alcanzó el stock máximo
                        disabled={atLimit}
                        title={
                          atLimit ? `Máximo disponible: ${maxStock}` : undefined
                        }
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.selectedSize,
                            item.selectedColor.name,
                            item.quantity + 1,
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* ✅ Aviso de stock bajo (≤ 3 unidades) */}
                  {!outOfStock && atLimit && (
                    <p className={styles.stockWarning}>
                      Solo quedan {maxStock} en stock
                    </p>
                  )}

                  <button
                    className={styles.remove}
                    onClick={() =>
                      removeItem(
                        item.product.id,
                        item.selectedSize,
                        item.selectedColor.name,
                      )
                    }
                  >
                    Eliminar
                  </button>
                </div>

                <span className={styles.itemTotal}>
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className={styles.summary}>
          <h2 className={styles.sumTitle}>Resumen del Pedido</h2>

          {freeShippingRemaining > 0 && (
            <div className={styles.upsell}>
              <p>
                Añade <strong>{formatPrice(freeShippingRemaining)}</strong> para{" "}
                <strong>envío gratis</strong>
              </p>
            </div>
          )}

          <div className={styles.rows}>
            <div className={styles.row}>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.row}>
              <span>Envío</span>
              <span>{shipping === 0 ? "¡Gratis!" : formatPrice(shipping)}</span>
            </div>
            <div className={`${styles.row} ${styles.totalRow}`}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            variant="fill"
            size="lg"
            fullWidth
            onClick={() => navigate("/checkout")}
          >
            Finalizar Compra →
          </Button>
          <Link to="/productos" className={styles.contShopping}>
            ← Continuar comprando
          </Link>

          <div className={styles.promoWrap}>
            <input
              className={styles.promoInput}
              type="text"
              placeholder="Código de descuento"
            />
            <button className={styles.promoBtn}>Aplicar</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
