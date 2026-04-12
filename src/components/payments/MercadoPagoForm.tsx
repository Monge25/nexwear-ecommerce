import React, { useEffect, useState } from "react";
import {
  CardNumber,
  SecurityCode,
  ExpirationDate,
  initMercadoPago,
  createCardToken,
} from "@mercadopago/sdk-react";
import orderService from "@/services/orderService";
import styles from "./MercadoPagoForm.module.css";

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
  street,
  interior,
  city,
  state,
  zipCode,
  country,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardholderName, setCardholder] = useState("");
  const [mpReady, setMpReady] = useState(false);

  useEffect(() => {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: "es-MX" });
    const t = setTimeout(() => setMpReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardholderName.trim()) {
      setError("Por favor ingresa el nombre del titular.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1. Crear token de tarjeta con Mercado Pago
      const token = await createCardToken({ cardholderName });
      if (!token?.id) {
        setError("No se pudo procesar la tarjeta. Verifica los datos.");
        setLoading(false);
        return;
      }

      // 2. Construir string de dirección
      const shippingAddress = [street, interior, city, state, zipCode, country]
        .filter(Boolean)
        .join(", ");

      // 3. Crear el pedido en el backend
      const order = await orderService.checkout({
        token: token.id,
        shippingAddress,
      });

      console.log("Payload a enviar:", {
        token: token.id,
        shippingAddress,
      });

      // 4. Notificar éxito — el padre se encarga de limpiar el carrito
      onSuccess(String(order.id));
    } catch (err: any) {
      console.error("Checkout error:", err);
      const msg =
        err?.response?.data?.message ??
        "Hubo un error con el pago. Intenta de nuevo.";
      setError(msg);
      onError?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {!mpReady ? (
        <div className={styles.loading}>Cargando formulario de pago…</div>
      ) : (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Número de tarjeta</label>
            <div className={styles.mpInput}>
              <CardNumber placeholder="1234 1234 1234 1234" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Vencimiento</label>
              <div className={styles.mpInput}>
                <ExpirationDate placeholder="MM/AA" mode="short" />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CVV</label>
              <div className={styles.mpInput}>
                <SecurityCode placeholder="123" />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Nombre en la tarjeta</label>
            <input
              type="text"
              placeholder="Como aparece en la tarjeta"
              value={cardholderName}
              onChange={(e) => setCardholder(e.target.value.toUpperCase())}
              className={styles.input}
              required
            />
          </div>
        </>
      )}

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
