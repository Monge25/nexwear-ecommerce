import React from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

interface Props {
  amount: number;
  onSuccess: (orderId: string) => void;
  onError?: () => void;
}

const PaypalButton: React.FC<Props> = ({
  amount,
  onSuccess,
  onError,
}) => {
  const [{ isPending }] = usePayPalScriptReducer();

  if (isPending) {
    return (
      <p style={{ fontSize: 12, color: "#9a8c7a", padding: "12px 0" }}>
        Cargando PayPal...
      </p>
    );
  }

  return (
    <PayPalButtons
      style={{
        layout: "vertical",
        color: "blue",
        shape: "rect",
        label: "pay",
      }}
      createOrder={async () => {
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            currency: "MXN",
          }),
        });

        const data = await res.json();
        return data.id;
      }}
      onApprove={async (data) => {
        try {
          const res = await fetch(
            `/api/paypal/capture-order/${data.orderID}`,
            {
              method: "POST",
            },
          );

          const capture = await res.json();
          onSuccess(capture.id);
        } catch (error) {
          console.error(error);
          onError?.();
        }
      }}
      onError={() => onError?.()}
    />
  );
};

export default PaypalButton;