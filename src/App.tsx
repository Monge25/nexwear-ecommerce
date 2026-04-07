import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import AppRouter from "./routes/AppRouter";
import "./styles/globals.css";
import WishlistModal from "./pages/Wishlist/WishlistModal";
import PayPalProvider from "./providers/PaypalProvider";
 
const App: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <WishlistProvider>
        <PayPalProvider>
          <AppRouter />
          <WishlistModal/>
        </PayPalProvider>
      </WishlistProvider>
    </CartProvider>
  </AuthProvider>
);
 
export default App;
 