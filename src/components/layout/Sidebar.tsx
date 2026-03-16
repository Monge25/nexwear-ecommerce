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
    itemCount,
    subtotal,
    shipping,
    total,
    freeShippingRemaining,
    removeItem,
    updateQuantity,
    closeCart,
  } = useCart();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

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
          <button
            className={styles.close}
            onClick={closeCart}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p>Tu bolsa está vacía</p>
              <span>Descubre las novedades</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
                className={styles.item}
              >
                <div
                  className={styles.itemImg}
                  style={{ background: item.selectedColor.hex }}
                >
                  {item.product.images[0] && (
                    <img src={item.product.images[0]} alt={item.product.name} />
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.product.name}</p>
                  <p className={styles.itemMeta}>
                    Talla: {item.selectedSize} · {item.selectedColor.name} ·{" "}
                    {formatPrice(item.product.price)} c/u
                  </p>
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
                <span className={styles.itemPrice}>
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            {/* Upsell */}
            <div className={styles.upsell}>
              {freeShippingRemaining === 0 ? (
                <p>
                  🎉 ¡Tienes <strong>envío gratis</strong>!
                </p>
              ) : (
                <p>
                  Añade <strong>{formatPrice(freeShippingRemaining)}</strong>{" "}
                  más para <strong>envío gratis</strong>
                </p>
              )}
              <div className={styles.upsellBar}>
                <div
                  className={styles.upsellFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className={styles.totals}>
              <div className={styles.row}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.row}>
                <span>Envío</span>
                <span>
                  {shipping === 0 ? "¡Gratis!" : formatPrice(shipping)}
                </span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              onClick={closeCart}
              className={styles.checkout}
            >
              Finalizar Compra →
            </Link>
            <p className={styles.secure}>
              🔒 Pago seguro · Devoluciones gratis · 30 días
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartSidebar;
