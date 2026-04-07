import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/utils/formatPrice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import orderService from "@/services/orderService";
import type { CheckoutData } from "@/types";
import styles from "./Checkout.module.css";
import PaypalButton from "@/components/payments/PaypalButton";

type Step = "shipping" | "payment" | "review";
type PaymentMethod = "card" | "paypal";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, shipping, total, clearCart } = useCart();
  const [step, setStep] = useState<Step>("shipping");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "México",
    cardNumber: "",
    cardHolder: "",
    cardExpiry: "",
    cardCVV: "",
    method: "card" as "card" | "paypal",
  });

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const data: CheckoutData = {
        newAddress: {
          label: "Principal",
          street: form.street,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
        },
        paymentMethod: form.method,
        cardData:
          form.method === "card"
            ? {
                number: form.cardNumber,
                holder: form.cardHolder,
                expiry: form.cardExpiry,
                cvv: form.cardCVV,
              }
            : undefined,
      };
      const order = await orderService.createOrder(data);
      clearCart();
      navigate(`/perfil/pedidos?order=${order.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al procesar el pedido",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Left: Steps */}
        <div className={styles.left}>
          <h1 className={styles.title}>Checkout</h1>

          {/* Step nav */}
          <div className={styles.stepNav}>
            {(["shipping", "payment", "review"] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`${styles.stepItem} ${step === s ? styles.stepActive : ""} ${i < ["shipping", "payment", "review"].indexOf(step) ? styles.stepDone : ""}`}
                >
                  <span className={styles.stepNum}>{i + 1}</span>
                  <span className={styles.stepLabel}>
                    {["Envío", "Pago", "Revisar"][i]}
                  </span>
                </div>
                {i < 2 && <div className={styles.stepLine} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step: Shipping */}
          {step === "shipping" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Dirección de envío</h2>
              <div className={styles.grid2}>
                <Input
                  label="Nombre"
                  value={form.firstName}
                  onChange={set("firstName")}
                  placeholder="Ana"
                />
                <Input
                  label="Apellido"
                  value={form.lastName}
                  onChange={set("lastName")}
                  placeholder="García"
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="ana@ejemplo.com"
              />
              <Input
                label="Teléfono"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+52 55 1234 5678"
              />
              <Input
                label="Calle y número"
                value={form.street}
                onChange={set("street")}
                placeholder="Av. Reforma 123"
              />
              <div className={styles.grid2}>
                <Input
                  label="Ciudad"
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Ciudad de México"
                />
                <Input
                  label="Estado"
                  value={form.state}
                  onChange={set("state")}
                  placeholder="CDMX"
                />
              </div>
              <div className={styles.grid2}>
                <Input
                  label="Código Postal"
                  value={form.zipCode}
                  onChange={set("zipCode")}
                  placeholder="06600"
                />
                <Input
                  label="País"
                  value={form.country}
                  onChange={set("country")}
                  placeholder="México"
                />
              </div>
              <Button
                variant="fill"
                size="lg"
                fullWidth
                onClick={() => setStep("payment")}
              >
                Continuar al Pago →
              </Button>
            </div>
          )}

          {/* Step: Payment */}
          {step === "payment" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Método de pago</h2>
              <div className={styles.payMethods}>
                {(["card", "paypal"] as const).map((m) => (
                  <label
                    key={m}
                    className={`${styles.payMethod} ${form.method === m ? styles.payMethodOn : ""}`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={form.method === m}
                      onChange={set("method")}
                    />
                    <span>
                      {m === "card"
                        ? "💳 Tarjeta de crédito/débito"
                        : "🔵 PayPal"}
                    </span>
                  </label>
                ))}
              </div>
              {form.method === "card" && (
                <>
                  <Input
                    label="Número de tarjeta"
                    value={form.cardNumber}
                    onChange={set("cardNumber")}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                  <Input
                    label="Titular"
                    value={form.cardHolder}
                    onChange={set("cardHolder")}
                    placeholder="ANA GARCIA"
                  />
                  <div className={styles.grid2}>
                    <Input
                      label="Vencimiento"
                      value={form.cardExpiry}
                      onChange={set("cardExpiry")}
                      placeholder="MM/YY"
                    />
                    <Input
                      label="CVV"
                      value={form.cardCVV}
                      onChange={set("cardCVV")}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </>
              )}

              {form.method === "card" && <></>}

              {form.method === "paypal" && (
                <div style={{ marginTop: 20 }}>
                  <PaypalButton
                    onSuccess={(orderId) => {
                      clearCart();
                      navigate(`/perfil/pedidos?order=${orderId}`);
                    }}
                  />
                </div>
              )}
              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep("shipping")}>
                  ← Volver
                </Button>
                <Button variant="fill" onClick={() => setStep("review")}>
                  Revisar Pedido →
                </Button>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Revisar y confirmar</h2>
              <div className={styles.reviewBlock}>
                <h3 className={styles.reviewLabel}>Dirección de envío</h3>
                <p>
                  {form.firstName} {form.lastName}
                </p>
                <p>
                  {form.street}, {form.city}, {form.state} {form.zipCode}
                </p>
                <p>{form.country}</p>
              </div>
              <div className={styles.reviewBlock}>
                <h3 className={styles.reviewLabel}>Método de pago</h3>
                <p>
                  {form.method === "card"
                    ? `Tarjeta terminada en ${form.cardNumber.slice(-4)}`
                    : "PayPal"}
                </p>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep("payment")}>
                  ← Volver
                </Button>
                <Button variant="gold" loading={loading} onClick={handleOrder}>
                  Confirmar Pedido
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order summary */}
        <aside className={styles.summary}>
          <h2 className={styles.sumTitle}>Tu pedido</h2>
          {items.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedSize}`}
              className={styles.sumItem}
            >
              <div
                className={styles.sumImg}
                style={{ background: item.selectedColor.hex }}
              >
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt="" />
                )}
                <span className={styles.sumQty}>{item.quantity}</span>
              </div>
              <div className={styles.sumItemInfo}>
                <p className={styles.sumName}>{item.product.name}</p>
                <p className={styles.sumMeta}>
                  {item.selectedSize} · {item.selectedColor.name}
                </p>
              </div>
              <span>{formatPrice(item.product.price * item.quantity)}</span>
            </div>
          ))}
          <div className={styles.sumTotals}>
            <div className={styles.sumRow}>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.sumRow}>
              <span>Envío</span>
              <span>{shipping === 0 ? "¡Gratis!" : formatPrice(shipping)}</span>
            </div>
            <div className={`${styles.sumRow} ${styles.sumTotal}`}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
