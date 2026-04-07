import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const PaypalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "USD",
        intent: "capture",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
};

export default PaypalProvider;