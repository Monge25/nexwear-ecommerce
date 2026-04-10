import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useFetch } from "@/hooks/useFetch";
import { formatPrice } from "@/utils/formatPrice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import orderService from "@/services/orderService";
import addressService, { Address } from "@/services/addressService";
import type { CheckoutData } from "@/types";
import styles from "./Checkout.module.css";
import PaypalButton from "@/components/payments/PaypalButton";

type Step = "shipping" | "payment" | "review";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, shipping, total, clearCart } = useCart();

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

  // ─────────────────────────────────────
  // Autocompletar Código Postal
  // ─────────────────────────────────────

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
      } catch (error) {
        console.error("ZIP error", error);
      }
    }, 500);

    setZipTimeout(timeout);
  };

  // ─────────────────────────────────────
  // Crear pedido
  // ─────────────────────────────────────

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
        {/* Left */}
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

          {/* ───────────────────────────── */}
          {/* SHIPPING */}
          {/* ───────────────────────────── */}

          {step === "shipping" && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Dirección de envío</h2>

              {/* Direcciones guardadas */}

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
                <Input
                  label="Nombre"
                  value={form.firstName}
                  onChange={set("firstName")}
                />
                <Input
                  label="Apellido"
                  value={form.lastName}
                  onChange={set("lastName")}
                />
              </div>

              <Input label="Email" value={form.email} onChange={set("email")} />

              <Input
                label="Teléfono"
                value={form.phone}
                onChange={set("phone")}
              />

              <div className={styles.grid2}>
                <Input
                  label="Calle"
                  value={form.street}
                  onChange={set("street")}
                />

                <Input
                  label="Colonia"
                  value={form.city}
                  onChange={set("city")}
                />

                <Input
                  label="Ciudad"
                  value={form.colony}
                  onChange={set("colony")}
                />

                <Input
                  label="Estado"
                  value={form.state}
                  onChange={set("state")}
                />
              </div>

              <div className={styles.grid2}>
                <Input
                  label="Código Postal"
                  value={form.zipCode}
                  onChange={(e) => {
                    set("zipCode")(e);
                    handleZipCode(e.target.value);
                  }}
                />

                <Input
                  label="País"
                  value={form.country}
                  onChange={set("country")}
                />
              </div>

              <Button
                variant="fill"
                fullWidth
                onClick={() => setStep("payment")}
              >
                Continuar al pago →
              </Button>
            </div>
          )}

          {/* ───────────────────────────── */}
          {/* PAYMENT */}
          {/* ───────────────────────────── */}

          {step === "payment" && (
            <div className={styles.stepContent}>
              <h2>Método de pago</h2>

              {form.method === "card" && (
                <>
                  <Input
                    label="Número tarjeta"
                    value={form.cardNumber}
                    onChange={set("cardNumber")}
                  />

                  <Input
                    label="Titular"
                    value={form.cardHolder}
                    onChange={set("cardHolder")}
                  />

                  <div className={styles.grid2}>
                    <Input
                      label="Expiración"
                      value={form.cardExpiry}
                      onChange={set("cardExpiry")}
                    />

                    <Input
                      label="CVV"
                      value={form.cardCVV}
                      onChange={set("cardCVV")}
                    />
                  </div>
                </>
              )}

              {form.method === "paypal" && (
                <PaypalButton
                  onSuccess={(orderId) => {
                    clearCart();
                    navigate(`/perfil/pedidos?order=${orderId}`);
                  }}
                />
              )}

              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep("shipping")}>
                  ← Volver
                </Button>

                <Button variant="fill" onClick={() => setStep("review")}>
                  Revisar →
                </Button>
              </div>
            </div>
          )}

          {/* ───────────────────────────── */}
          {/* REVIEW */}
          {/* ───────────────────────────── */}

          {step === "review" && (
            <div className={styles.stepContent}>
              <h2>Revisar pedido</h2>

              {error && <p className={styles.error}>{error}</p>}

              <Button variant="gold" loading={loading} onClick={handleOrder}>
                Confirmar Pedido
              </Button>
            </div>
          )}
        </div>

        {/* ───────────────────────────── */}
        {/* SUMMARY */}
        {/* ───────────────────────────── */}

        <aside className={styles.summary}>
          <h2 className={styles.sumTitle}>Tu pedido</h2>

          {items.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedSize}`}
              className={styles.sumItem}
            >
              {/* Imagen */}
              <div
                className={styles.sumImg}
                style={{ background: item.selectedColor?.hex }}
              >
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt={item.product.name} />
                )}

                <span className={styles.sumQty}>{item.quantity}</span>
              </div>

              {/* Info */}
              <div className={styles.sumItemInfo}>
                <p className={styles.sumName}>{item.product.name}</p>

                <p className={styles.sumMeta}>Talla: {item.selectedSize}</p>

                <p className={styles.sumMeta}>
                  Color: {item.selectedColor?.name}
                </p>
              </div>

              {/* Precio */}
              <span className={styles.sumPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}

          {/* Totales */}

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
