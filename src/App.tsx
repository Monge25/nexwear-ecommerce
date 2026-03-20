import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import AppRouter from "./routes/AppRouter";
import "./styles/globals.css";
 
const App: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <WishlistProvider>
        <AppRouter />
      </WishlistProvider>
    </CartProvider>
  </AuthProvider>
);
 
export default App;
 