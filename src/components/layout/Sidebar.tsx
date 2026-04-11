import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/utils/formatPrice";
import { FREE_SHIPPING_THRESHOLD } from "@/utils/constants";
import styles from "./Sidebar.module.css";

const CartSidebar: React.FC = () => {
  const {
    isOpen,
    items,
    availableItems,
    outOfStockItems,
    hasOutOfStock,
    itemCount,
    subtotal,
    shipping,
    total,
    freeShippingRemaining,
    removeItem,
    updateQuantity,
    closeCart,
    removeOutOfStockItems,
  } = useCart();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // ── Helper: obtener stock de un item ──────────────────────────────
  const getStock = (item: typeof items[0]) => {
    const variant = item.product.variants?.find(
      (v) => v.color === item.selectedColor.name && v.size === item.selectedSize,
    );
    return variant?.stock ?? item.product.stock ?? Infinity;
  };

  // ── Renderiza un item ─────────────────────────────────────────────
  const renderItem = (item: typeof items[0], isUnavailable = false) => {
    const displayImage = item.variantImage ?? item.product.imageUrl;
    const maxStock = getStock(item);
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
          {displayImage && (
            <img src={displayImage} alt={item.product.name} />
          )}
          {/* Overlay agotado */}
          {isUnavailable && (
            <div className={styles.outOfStockOverlay}>Agotado</div>
          )}
        </div>

        {/* Info */}
        <div className={styles.itemInfo}>
          <p className={styles.itemName}>{item.product.name}</p>
          <p className={styles.itemMeta}>
            Talla: {item.selectedSize} ·{" "}
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: "50%", background: item.selectedColor.hex,
              border: "1px solid rgba(0,0,0,0.15)",
              marginRight: 3, verticalAlign: "middle",
            }} />
            {item.selectedColor.name} · {formatPrice(item.product.price)} c/u
          </p>

          {/* Controles solo si está disponible */}
          {isUnavailable ? (
            <p className={styles.outOfStockLabel}>Sin stock</p>
          ) : (
            <>
              <div className={styles.qty}>
                <button
                  onClick={() => updateQuantity(
                    item.product.id, item.selectedSize,
                    item.selectedColor.name, item.quantity - 1,
                  )}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                {/* Botón + deshabilitado al llegar al límite */}
                <button
                  disabled={atLimit}
                  title={atLimit ? `Máximo: ${maxStock}` : undefined}
                  onClick={() => updateQuantity(
                    item.product.id, item.selectedSize,
                    item.selectedColor.name, item.quantity + 1,
                  )}
                >
                  +
                </button>
              </div>
              {/* Aviso de stock bajo */}
              {atLimit && (
                <p className={styles.stockWarning}>
                  Solo quedan {maxStock} en stock
                </p>
              )}
            </>
          )}

          <button
            className={styles.remove}
            onClick={() => removeItem(
              item.product.id, item.selectedSize, item.selectedColor.name,
            )}
          >
            Eliminar
          </button>
        </div>

        <span className={`${styles.itemPrice} ${isUnavailable ? styles.itemPriceMuted : ""}`}>
          {formatPrice(item.product.price * item.quantity)}
        </span>
      </div>
    );
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.open : ""}`}
        onClick={closeCart}
      />
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ""}`}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Tu Bolsa</h2>
            <p className={styles.sub}>
              {itemCount} artículo{itemCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button className={styles.close} onClick={closeCart} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p>Tu bolsa está vacía</p>
              <span>Descubre las novedades</span>
            </div>
          ) : (
            <>
              {/* Items disponibles */}
              {availableItems.map((item) => renderItem(item, false))}

              {/* Sección agotados */}
              {hasOutOfStock && (
                <div className={styles.outOfStockSection}>
                  <div className={styles.outOfStockHeader}>
                    <span className={styles.outOfStockTitle}>
                      Sin stock ({outOfStockItems.length})
                    </span>
                    <button
                      className={styles.removeAllBtn}
                      onClick={removeOutOfStockItems}
                    >
                      Eliminar todos
                    </button>
                  </div>
                  {outOfStockItems.map((item) => renderItem(item, true))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>

            {/* Aviso si hay agotados */}
            {hasOutOfStock && (
              <div className={styles.stockAlert}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p>
                  {availableItems.length === 0
                    ? "Todos los productos están agotados."
                    : `${outOfStockItems.length} producto${outOfStockItems.length > 1 ? "s" : ""} agotado${outOfStockItems.length > 1 ? "s" : ""} no se incluirá${outOfStockItems.length > 1 ? "n" : ""} en la compra.`
                  }
                </p>
              </div>
            )}

            {/* Upsell — solo si hay items disponibles */}
            {availableItems.length > 0 && (
              <div className={styles.upsell}>
                {freeShippingRemaining === 0 ? (
                  <p>¡Tienes <strong>envío gratis</strong>!</p>
                ) : (
                  <p>
                    Añade <strong>{formatPrice(freeShippingRemaining)}</strong>{" "}
                    más para <strong>envío gratis</strong>
                  </p>
                )}
                <div className={styles.upsellBar}>
                  <div className={styles.upsellFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className={styles.totals}>
              <div className={styles.row}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.row}>
                <span>Envío</span>
                <span>{shipping === 0 ? "¡Gratis!" : formatPrice(shipping)}</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Checkout deshabilitado si todos están agotados */}
            {availableItems.length > 0 ? (
              <Link to="/checkout" onClick={closeCart} className={styles.checkout}>
                Finalizar Compra →
              </Link>
            ) : (
              <button className={styles.checkoutDisabled} disabled>
                Sin productos disponibles
              </button>
            )}

            <p className={styles.secure}>
              Pago seguro · Devoluciones gratis · 30 días
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartSidebar;