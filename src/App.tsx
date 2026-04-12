import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import AppRouter from "./routes/AppRouter";
import "./styles/globals.css";
import WishlistModal from "./pages/Wishlist/WishlistModal";

const App: React.FC = () => (
  <React.StrictMode>
  
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppRouter />
            <WishlistModal />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
  </React.StrictMode>
);

export default App;