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
    availableItems,
    outOfStockItems,
    hasOutOfStock,
    subtotal,
    shipping,
    total,
    freeShippingRemaining,
    updateQuantity,
    removeItem,
    clearCart,
    removeOutOfStockItems,
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

  // ── Helper para renderizar un item ────────────────────────────────
  const renderItem = (item: (typeof items)[0], isUnavailable = false) => {
    const displayImage = item.variantImage ?? item.product.imageUrl;
    const variant = item.product.variants?.find(
      (v) =>
        v.color === item.selectedColor.name && v.size === item.selectedSize,
    );
    const maxStock = variant?.stock ?? item.product.stock ?? Infinity;
    const atLimit = !isUnavailable && item.quantity >= maxStock;

    return (
      <div
        key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
        className={`${styles.item} ${isUnavailable ? styles.itemUnavailable : ""}`}
      >
        {/* Imagen */}
        <div
          className={styles.itemImg}
          style={{ background: item.selectedColor.hex + "22" }}
        >
          {displayImage && <img src={displayImage} alt={item.product.name} />}
          {isUnavailable && (
            <div className={styles.outOfStockOverlay}>Agotado</div>
          )}
        </div>

        {/* Info */}
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

          {/* Controles de cantidad — solo si está disponible */}
          {!isUnavailable && (
            <>
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
                  disabled={atLimit}
                  title={atLimit ? `Máximo disponible: ${maxStock}` : undefined}
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
              {atLimit && (
                <p className={styles.stockWarning}>
                  Solo quedan {maxStock} en stock
                </p>
              )}
            </>
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

        {/* Precio */}
        <span
          className={`${styles.itemTotal} ${isUnavailable ? styles.itemTotalMuted : ""}`}
        >
          {formatPrice(item.product.price * item.quantity)}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {/* ── Header ── */}
          <div className={styles.header}>
            <h1 className={styles.title}>Tu Bolsa</h1>
            <button className={styles.clearAll} onClick={clearCart}>
              Vaciar bolsa
            </button>
          </div>

          {/* ── Items disponibles ── */}
          {availableItems.map((item) => renderItem(item, false))}

          {/* ── Sección de agotados ── */}
          {hasOutOfStock && (
            <div className={styles.outOfStockSection}>
              <div className={styles.outOfStockHeader}>
                <div className={styles.outOfStockTitleRow}>
                  {/* Ícono de advertencia */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className={styles.outOfStockTitle}>
                    Productos no disponibles ({outOfStockItems.length})
                  </span>
                </div>
                <button
                  className={styles.removeAllBtn}
                  onClick={removeOutOfStockItems}
                >
                  Eliminar todos
                </button>
              </div>

              <p className={styles.outOfStockDesc}>
                Estos productos se agotaron y no se incluirán en tu compra.
                Puedes eliminarlos o guardarlos para cuando vuelvan a estar
                disponibles.
              </p>

              <div className={styles.outOfStockItems}>
                {outOfStockItems.map((item) => renderItem(item, true))}
              </div>
            </div>
          )}
        </div>

        {/* ── Summary ── */}
        <aside className={styles.summary}>
          <h2 className={styles.sumTitle}>Resumen del Pedido</h2>

          {/* Aviso si hay agotados */}
          {hasOutOfStock && (
            <div className={styles.summaryWarning}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p>
                {availableItems.length === 0
                  ? "Todos los productos están agotados."
                  : `${outOfStockItems.length} producto${outOfStockItems.length > 1 ? "s" : ""} agotado${outOfStockItems.length > 1 ? "s" : ""} no se incluirá${outOfStockItems.length > 1 ? "n" : ""} en la compra.`}
              </p>
            </div>
          )}

          {freeShippingRemaining > 0 && availableItems.length > 0 && (
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

          {/* Botón de checkout — deshabilitado si todos están agotados */}
          <Button
            variant="fill"
            size="lg"
            fullWidth
            disabled={availableItems.length === 0}
            onClick={() => navigate("/checkout")}
          >
            {availableItems.length === 0
              ? "Sin productos disponibles"
              : "Finalizar Compra →"}
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
