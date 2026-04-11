import React from "react";
import { PayPalButtons, usePayPalScriptReducer, FUNDING } from "@paypal/react-paypal-js";
import { useCart } from "@/hooks/useCart";
import orderService from "@/services/orderService";

interface Props {
  fundingSource: "paypal" | "card";
  onSuccess: (orderId: string) => void;
  onError?: () => void;
}

const PaypalButton: React.FC<Props> = ({ fundingSource, onSuccess, onError }) => {
  const { total, availableItems } = useCart();
  const [{ isPending }] = usePayPalScriptReducer();

  if (isPending) {
    return (
      <p style={{ fontSize: 12, color: "#9a8c7a", padding: "12px 0" }}>
        Cargando...
      </p>
    );
  }

  return (
    <PayPalButtons
      fundingSource={fundingSource === "card" ? FUNDING.CARD : FUNDING.PAYPAL}
      style={{
        layout: "vertical",
        shape: "rect",
        ...(fundingSource === "paypal" && { color: "blue", label: "pay" }),
      }}
      createOrder={(_, actions) => {
        return actions.order.create({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "MXN",
                value: total.toFixed(2),
              },
            },
          ],
        });
      }}
      onApprove={async (_, actions) => {
        try {
          const details = await actions.order?.capture();
          const order = await orderService.createOrder({
            paymentMethod: fundingSource,
            paypalOrderId: details?.id,
            items: availableItems,
          });
          onSuccess(order.id);
        } catch (err) {
          console.error("PayPal error:", err);
          onError?.();
        }
      }}
      onError={(err) => {
        console.error("PayPal error:", err);
        onError?.();
      }}
    />
  );
};

export default PaypalButton;