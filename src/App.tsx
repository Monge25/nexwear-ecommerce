import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppRouter from "./routes/AppRouter";
import "./styles/globals.css";

const App: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <AppRouter />
    </CartProvider>
  </AuthProvider>
);

export default App;
