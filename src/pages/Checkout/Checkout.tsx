import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useFetch } from "@/hooks/useFetch";
import { formatPrice } from "@/utils/formatPrice";
import Button from "@/components/ui/Button";
import orderService from "@/services/orderService";
import addressService, { Address } from "@/services/addressService";
import type { CheckoutData } from "@/types";
import styles from "./Checkout.module.css";
import PaypalButton from "@/components/payments/PaypalButton";

type Step = "shipping" | "payment" | "review";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { availableItems, subtotal, shipping, total, clearCart } = useCart();

  const [step, setStep] = useState<Step>("shipping");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zipTimeout, setZipTimeout] = useState<NodeJS.Timeout | null>(null);

  const { data: addresses = [] } = useFetch<Address[]>(
    () => addressService.getUserAddresses(),
    [],
  );

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    colony: "",
    city: "",
    state: "",
    zipCode: "",
    country: "México",
    method: "card" as "card" | "paypal",
  });

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleZipCode = (zip: string) => {
    if (zipTimeout) clearTimeout(zipTimeout);
    const timeout = setTimeout(async () => {
      if (zip.length !== 5) return;
      try {
        const res = await fetch(`https://api.zippopotam.us/MX/${zip}`);
        if (!res.ok) return;
        const data = await res.json();
        const place = data.places?.[0];
        if (place) {
          setForm((f) => ({
            ...f,
            city: place["place name"],
            state: place.state,
            country: "México",
          }));
        }
      } catch (err) {
        console.error("ZIP error", err);
      }
    }, 500);
    setZipTimeout(timeout);
  };

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

  // ── Callback compartido para ambos métodos ────────────────────────
  const handlePaypalSuccess = (orderId: string) => {
    clearCart();
    navigate(`/perfil/pedidos?order=${orderId}`);
  };

  const handlePaypalError = () => {
    setError("Hubo un error con el pago. Intenta de nuevo.");
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <h1 className={styles.title}>Checkout</h1>

          {/* Step nav */}
          <div className={styles.stepNav}>
            {(["shipping", "payment", "review"] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`${styles.stepItem} ${
                    step === s ? styles.stepActive : ""
                  }`}
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

          {/* ── SHIPPING ─────────────────────────────────────────────────── */}
          {step === "shipping" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Dirección de envío</h2>

              {Array.isArray(addresses) && addresses.length > 0 && (
                <div className={styles.savedAddresses}>
                  <h3>Direcciones guardadas</h3>
                  {addresses.map((addr: Address) => (
                    <div
                      key={addr.id}
                      className={styles.addressCard}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          street: addr.street,
                          city: addr.city,
                          state: addr.state,
                          zipCode: addr.zipCode,
                          country: addr.country,
                        }))
                      }
                    >
                      <strong>{addr.label}</strong>
                      <p>{addr.street}</p>
                      <p>
                        {addr.city}, {addr.state}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre</label>
                  <input
                    className={styles.formInput}
                    value={form.firstName}
                    onChange={set("firstName")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Apellido</label>
                  <input
                    className={styles.formInput}
                    value={form.lastName}
                    onChange={set("lastName")}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <input
                  className={styles.formInput}
                  value={form.email}
                  onChange={set("email")}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Teléfono</label>
                <input
                  className={styles.formInput}
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Calle</label>
                  <input
                    className={styles.formInput}
                    value={form.street}
                    onChange={set("street")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Colonia</label>
                  <input
                    className={styles.formInput}
                    value={form.colony}
                    onChange={set("colony")}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ciudad</label>
                  <input
                    className={styles.formInput}
                    value={form.city}
                    onChange={set("city")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Estado</label>
                  <input
                    className={styles.formInput}
                    value={form.state}
                    onChange={set("state")}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código Postal</label>
                  <input
                    className={styles.formInput}
                    value={form.zipCode}
                    onChange={(e) => {
                      set("zipCode")(e);
                      handleZipCode(e.target.value);
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>País</label>
                  <input
                    className={styles.formInput}
                    value={form.country}
                    onChange={set("country")}
                  />
                </div>
              </div>

              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => navigate("/")}>
                  ← Volver
                </Button>
                <Button variant="fill" onClick={() => setStep("payment")}>
                  Continuar con el Pago →
                </Button>
              </div>
            </div>
          )}

          {/* ── PAYMENT ──────────────────────────────────────────────────── */}
          {step === "payment" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Método de pago</h2>

              <div className={styles.methodSelector}>
                {/* Tarjeta */}
                <label
                  className={`${styles.methodOption} ${form.method === "card" ? styles.methodSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={form.method === "card"}
                    onChange={() => setForm((f) => ({ ...f, method: "card" }))}
                    className={styles.methodRadio}
                  />
                  <div className={styles.methodBody}>
                    <div className={styles.methodHeader}>
                      <span className={styles.methodLabel}>
                        Tarjeta de crédito / débito
                      </span>
                      <div className={styles.cardBrands}>
                        <img
                          src="https://vectorified.com/image/visa-logo-vector-17.png"
                          alt="Visa"
                          style={{ height: 13 }}
                        />
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                          alt="Mastercard"
                          style={{ height: 20 }}
                        />
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg"
                          alt="Amex"
                          style={{ height: 20 }}
                        />
                      </div>
                    </div>
                    <p className={styles.methodHint}>
                      Pago seguro con encriptación SSL de 256 bits
                    </p>
                  </div>
                </label>

                {/* PayPal */}
                <label
                  className={`${styles.methodOption} ${form.method === "paypal" ? styles.methodSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={form.method === "paypal"}
                    onChange={() =>
                      setForm((f) => ({ ...f, method: "paypal" }))
                    }
                    className={styles.methodRadio}
                  />
                  <div className={styles.methodBody}>
                    <div className={styles.methodHeader}>
                      <span className={styles.methodLabel}>PayPal</span>
                    </div>
                    <p className={styles.methodHint}>
                      Serás redirigido para completar el pago de forma segura
                    </p>
                  </div>
                </label>
              </div>

              {/* Tarjeta — widget de PayPal solo con opción de tarjeta */}
              {form.method === "card" && (
                <div className={styles.paypalWrap}>
                  <PaypalButton
                    fundingSource="card"
                    onSuccess={handlePaypalSuccess}
                    onError={handlePaypalError}
                  />
                </div>
              )}

              {/* PayPal — widget de PayPal normal */}
              {form.method === "paypal" && (
                <div className={styles.paypalWrap}>
                  <PaypalButton
                    fundingSource="paypal"
                    onSuccess={handlePaypalSuccess}
                    onError={handlePaypalError}
                  />
                </div>
              )}

              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => navigate("shipping")}>
                  ← Volver
                </Button>
                <Button variant="fill" onClick={() => setStep("review")}>
                  Continuar con el pedido →
                </Button>
              </div>
            </div>
          )}

          {/* ── REVIEW ───────────────────────────────────────────────────── */}
          {step === "review" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Revisar pedido</h2>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.reviewBlock}>
                <p className={styles.reviewLabel}>Dirección de envío</p>
                <p>
                  {form.firstName} {form.lastName}
                  <br />
                  {form.street}
                  <br />
                  {form.colony}, {form.city}
                  <br />
                  {form.state}, {form.zipCode}
                  <br />
                  {form.country}
                </p>
              </div>

              <div className={styles.reviewBlock}>
                <p className={styles.reviewLabel}>Método de pago</p>
                <p>
                  {form.method === "card"
                    ? "Tarjeta de crédito / débito"
                    : "PayPal"}
                </p>
              </div>

              <div className={styles.reviewBlock}>
                <p className={styles.reviewLabel}>Envío</p>
                <p>
                  Envío estándar
                  <br />
                  Entrega estimada: 3 - 5 días hábiles
                </p>
              </div>

              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep("payment")}>
                  ← Volver
                </Button>
                <Button variant="fill" loading={loading} onClick={handleOrder}>
                  Confirmar Pedido
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── SUMMARY ──────────────────────────────────────────────────────── */}
        <aside className={styles.summary}>
          <h2 className={styles.sumTitle}>Tu pedido</h2>

          {availableItems.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
              className={styles.sumItem}
            >
              <div
                className={styles.sumImg}
                style={{ background: item.selectedColor?.hex }}
              >
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt={item.product.name} />
                )}
                <span className={styles.sumQty}>{item.quantity}</span>
              </div>
              <div className={styles.sumItemInfo}>
                <p className={styles.sumName}>{item.product.name}</p>
                <p className={styles.sumMeta}>Talla: {item.selectedSize}</p>
                <p className={styles.sumMeta}>
                  Color: {item.selectedColor?.name}
                </p>
              </div>
              <span className={styles.sumPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}

          <div className={styles.sumTotals}>
            <div className={styles.sumRow}>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.sumRow}>
              <span>Envío</span>
              <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
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
