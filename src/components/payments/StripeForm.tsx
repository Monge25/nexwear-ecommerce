import { useEffect, useRef, useState } from "react";
import orderService from "@/services/orderService";
import styles from "./MercadoPagoForm.module.css"; // reutilizamos el mismo CSS

declare global {
  interface Window {
    Stripe: any;
  }
}

interface Props {
  addressId?: string;
  street?: string;
  interior?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  saveAddress?: boolean;
  addressAlias?: string;
  onSuccess: (orderId: string) => void;
  onError?: () => void;
}

const StripeForm: React.FC<Props> = ({
  addressId,
  street,
  interior,
  city,
  state,
  zipCode,
  country,
  phone,
  saveAddress,
  addressAlias,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);

  const stripeRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const initStripe = () => {
      if (!window.Stripe) {
        setTimeout(initStripe, 500);
        return;
      }

      if (mountedRef.current) return; // evitar doble montaje en StrictMode
      mountedRef.current = true;

      const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      const elements = stripe.elements();

      const cardElement = elements.create("card", {
        style: {
          base: {
            fontFamily: "DM Sans, sans-serif",
            fontSize: "13px",
            color: "#1a1a1a",
            "::placeholder": { color: "#aaa" },
          },
          invalid: { color: "#a83232" },
        },
        hidePostalCode: true,
      });

      cardElement.mount("#stripe-card-element");

      cardElement.on("ready", () => setStripeReady(true));
      cardElement.on("change", (event: any) => {
        if (event.error) {
          setError(event.error.message);
        } else {
          setError("");
        }
      });

      stripeRef.current = stripe;
      cardElementRef.current = cardElement;
    };

    initStripe();

    return () => {
      if (cardElementRef.current) {
        try {
          cardElementRef.current.unmount();
        } catch {}
      }
      mountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeRef.current || !cardElementRef.current) return;

    setLoading(true);
    setError("");

    try {
      // Stripe genera el paymentMethodId a partir de los datos de la tarjeta
      const { paymentMethod, error: stripeError } =
        await stripeRef.current.createPaymentMethod({
          type: "card",
          card: cardElementRef.current,
        });

      if (stripeError) {
        setError(stripeError.message ?? "Error al procesar la tarjeta.");
        onError?.();
        return;
      }

      // Construir payload según si se usa dirección guardada o nueva
      const payload = addressId
        ? {
            paymentMethodId: paymentMethod.id,
            addressId,
          }
        : {
            paymentMethodId: paymentMethod.id,
            street,
            interior,
            city,
            state,
            zipCode,
            country,
            phone,
            saveAddress: saveAddress ?? false,
            addressAlias: saveAddress ? addressAlias : undefined,
          };

      const order = await orderService.checkout(payload);
      onSuccess(String(order.id));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Hubo un error al procesar el pago.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      onError?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {!stripeReady && (
        <div className={styles.loading}>Cargando formulario de pago…</div>
      )}

      <div
        style={{
          visibility: stripeReady ? "visible" : "hidden",
          height: stripeReady ? "auto" : 0,
        }}
      >
        <div className={styles.field}>
          <label className={styles.label}>Datos de tarjeta</label>
          {/* Stripe monta aquí el CardElement (número, vencimiento y CVV en uno) */}
          <div id="stripe-card-element" className={styles.mpInput} />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className={styles.btn}
        disabled={loading || !stripeReady}
      >
        {loading ? (
          <span className={styles.spinner}>
            <span className={styles.spinnerIcon} /> Procesando…
          </span>
        ) : (
          "Confirmar y Pagar"
        )}
      </button>

      <p className={styles.secure}>Pago seguro procesado por Stripe</p>
    </form>
  );
};

export default StripeForm;