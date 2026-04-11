import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import AppRouter from "./routes/AppRouter";
import "./styles/globals.css";
import WishlistModal from "./pages/Wishlist/WishlistModal";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const App: React.FC = () => (
  <React.StrictMode>
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "MXN",
        locale: "es_MX",
      }}
    >
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppRouter />
            <WishlistModal />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </PayPalScriptProvider>
  </React.StrictMode>
);

export default App;