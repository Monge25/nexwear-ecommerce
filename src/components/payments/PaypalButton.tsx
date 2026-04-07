import { PayPalButtons } from "@paypal/react-paypal-js";
import { useCart } from "@/hooks/useCart";
import orderService from "@/services/orderService";

interface Props {
  onSuccess: (orderId: string) => void;
}

const PaypalButton: React.FC<Props> = ({ onSuccess }) => {
  const { total, items } = useCart();

  return (
    <PayPalButtons
      createOrder={(_, actions) => {
        return actions.order.create({
          intent: "CAPTURE", // ← ESTA ES LA SOLUCIÓN
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: total.toFixed(2),
              },
            },
          ],
        });
      }}
      onApprove={async (_, actions) => {
        const details = await actions.order?.capture();

        const order = await orderService.createOrder({
          paymentMethod: "paypal",
          paypalOrderId: details?.id,
          items,
        });

        onSuccess(order.id);
      }}
    />
  );
};

export default PaypalButton;