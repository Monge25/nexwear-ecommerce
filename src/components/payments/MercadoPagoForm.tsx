import { useEffect, useRef, useState } from "react";
import orderService from "@/services/orderService";
import styles from "./MercadoPagoForm.module.css";

declare global {
  interface Window {
    MercadoPago: any;
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

const MercadoPagoForm: React.FC<Props> = ({
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
  const [mpReady, setMpReady] = useState(false);
  const cardFormRef = useRef<any>(null);

  useEffect(() => {
    console.log("useEffect ejecutado");

    const initMP = () => {
      console.log(
        "initMP llamado, window.MercadoPago:",
        typeof window.MercadoPago,
      );

      if (!window.MercadoPago) {
        console.log("MP no listo, reintentando en 500ms...");
        setTimeout(initMP, 500);
        return;
      }

      console.log(
        "Inicializando MercadoPago con key:",
        import.meta.env.VITE_MP_PUBLIC_KEY?.slice(0, 15),
      );

      const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, {
        locale: "es-MX",
      });

      const cardForm = mp.cardForm({
        amount: "100",
        iframe: true,
        form: {
          id: "mp-form",
          cardNumber: {
            id: "mp-cardNumber",
            placeholder: "1234 1234 1234 1234",
          },
          expirationDate: { id: "mp-expirationDate", placeholder: "MM/AA" },
          securityCode: { id: "mp-securityCode", placeholder: "CVV" },
          cardholderName: {
            id: "mp-cardholderName",
            placeholder: "Como aparece en la tarjeta",
          },
          issuer: { id: "mp-issuer" },
          installments: { id: "mp-installments" },
        },
        callbacks: {
          onFormMounted: (err: any) => {
            console.log("onFormMounted callback, error:", err);
            if (err) {
              console.error("Error montando formulario MP:", err);
              return;
            }
            console.log("Formulario MP montado correctamente");
            setMpReady(true);
          },
          onSubmit: async (event: any) => {
            event.preventDefault();
            setLoading(true);
            setError("");
            try {
              const { paymentMethodId, token } = cardForm.getCardFormData();
              console.log(
                "Token generado:",
                token,
                "PaymentMethod:",
                paymentMethodId,
              );

              const payload = addressId
                ? { token, addressId, paymentMethodId }
                : {
                    token,
                    street,
                    interior,
                    city,
                    state,
                    zipCode,
                    country,
                    phone,
                    saveAddress: saveAddress ?? false,
                    addressAlias: saveAddress ? addressAlias : undefined,
                    paymentMethodId,
                  };

              const order = await orderService.checkout(payload);
              onSuccess(String(order.id));
            } catch (err: any) {
              const msg =
                err?.response?.data?.message ?? "Hubo un error con el pago.";
              setError(typeof msg === "string" ? msg : JSON.stringify(msg));
              onError?.();
            } finally {
              setLoading(false);
            }
          },
          onFetching: (resource: any) => {
            console.log("MP fetching:", resource);
          },
          onError: (err: any) => {
            console.error("MP error:", err);
          },
        },
      });

      cardFormRef.current = cardForm;
    };

    initMP();

    return () => {
      // Cleanup al desmontar
      if (cardFormRef.current) {
        try {
          cardFormRef.current.unmount?.();
        } catch {}
      }
    };
  }, []);

  return (
    <form id="mp-form" className={styles.form}>
      {!mpReady && (
        <div className={styles.loading}>Cargando formulario de pago…</div>
      )}

      <div
        style={{
          visibility: mpReady ? "visible" : "hidden",
          height: mpReady ? "auto" : 0,
        }}
      >
        <div className={styles.field}>
          <label className={styles.label}>Número de tarjeta</label>
          <div id="mp-cardNumber" className={styles.mpInput} />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Vencimiento</label>
            <div id="mp-expirationDate" className={styles.mpInput} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>CVV</label>
            <div id="mp-securityCode" className={styles.mpInput} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nombre en la tarjeta</label>
          <input
            id="mp-cardholderName"
            className={styles.input}
            type="text"
            placeholder="Como aparece en la tarjeta"
          />
        </div>
      </div>

      <select id="mp-issuer" style={{ display: "none" }} />
      <select id="mp-installments" style={{ display: "none" }} />

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className={styles.btn}
        disabled={loading || !mpReady}
      >
        {loading ? (
          <span className={styles.spinner}>
            <span className={styles.spinnerIcon} /> Procesando…
          </span>
        ) : (
          "Confirmar y Pagar"
        )}
      </button>

      <p className={styles.secure}>Pago seguro procesado por Mercado Pago</p>
    </form>
  );
};

export default MercadoPagoForm;
