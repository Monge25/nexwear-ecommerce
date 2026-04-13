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
  addressId, street, interior, city, state,
  zipCode, country, phone, saveAddress, addressAlias,
  onSuccess, onError,
}) => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [mpReady, setMpReady]   = useState(false);
  const mpRef = useRef<any>(null);

  useEffect(() => {
    const initMP = () => {
      if (!window.MercadoPago) {
        setTimeout(initMP, 500);
        return;
      }

      const mp = new window.MercadoPago(
        import.meta.env.VITE_MP_PUBLIC_KEY,
        { locale: "es-MX" }
      );
      mpRef.current = mp;

      const cardForm = mp.cardForm({
        amount: "100",
        iframe: true,
        form: {
          id: "mp-form",
          cardNumber: {
            id: "mp-cardNumber",
            placeholder: "1234 1234 1234 1234",
          },
          expirationDate: {
            id: "mp-expirationDate",
            placeholder: "MM/AA",
          },
          securityCode: {
            id: "mp-securityCode",
            placeholder: "CVV",
          },
          cardholderName: {
            id: "mp-cardholderName",
            placeholder: "Como aparece en la tarjeta",
          },
          issuer: { id: "mp-issuer" },
          installments: { id: "mp-installments" },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) {
              console.error("Error montando formulario MP:", error);
              return;
            }
            setMpReady(true);
          },
          onSubmit: async (event: any) => {
            event.preventDefault();
            setLoading(true);
            setError("");

            try {
              const {
                paymentMethodId,
                issuerId,
                cardholderEmail,
                token,
                installments,
                identificationNumber,
                identificationType,
              } = cardForm.getCardFormData();

              console.log("CardForm data:", { paymentMethodId, token });

              const payload = addressId
                ? { token, addressId, paymentMethodId }
                : {
                    token, street, interior, city, state,
                    zipCode, country, phone,
                    saveAddress: saveAddress ?? false,
                    addressAlias: saveAddress ? addressAlias : undefined,
                    paymentMethodId,
                  };

              const order = await orderService.checkout(payload);
              onSuccess(String(order.id));

            } catch (err: any) {
              console.error("Checkout error:", err);
              const msg = err?.response?.data?.message ?? "Hubo un error con el pago.";
              setError(typeof msg === "string" ? msg : JSON.stringify(msg));
              onError?.();
            } finally {
              setLoading(false);
            }
          },
          onFetching: (resource: any) => {
            console.log("Fetching resource:", resource);
          }
        },
      });
    };

    initMP();
  }, []);

  return (
    <form id="mp-form" className={styles.form}>
      {!mpReady && (
        <div className={styles.loading}>Cargando formulario de pago…</div>
      )}

      <div className={styles.field} style={{ display: mpReady ? "block" : "none" }}>
        <label className={styles.label}>Número de tarjeta</label>
        <div id="mp-cardNumber" className={styles.mpInput} />
      </div>

      <div className={styles.row} style={{ display: mpReady ? "flex" : "none" }}>
        <div className={styles.field}>
          <label className={styles.label}>Vencimiento</label>
          <div id="mp-expirationDate" className={styles.mpInput} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>CVV</label>
          <div id="mp-securityCode" className={styles.mpInput} />
        </div>
      </div>

      <div className={styles.field} style={{ display: mpReady ? "block" : "none" }}>
        <label className={styles.label}>Nombre en la tarjeta</label>
        <div id="mp-cardholderName" className={styles.mpInput} />
      </div>

      {/* Campos ocultos requeridos por MP */}
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