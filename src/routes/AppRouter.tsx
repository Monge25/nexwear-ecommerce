import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartSidebar from "@/components/layout/Sidebar";
import Loader from "@/components/ui/Loader";
import AuthModal from "@/components/common/AuthModal";
import PrivateRoute from "./PrivateRoute";
import AdminRoute from "./AdminRoute";
import { ROUTES } from "@/utils/constants";

const Home = lazy(() => import("@/pages/Home/Home"));
const Products = lazy(() => import("@/pages/Products/Products"));
const ProductDetail = lazy(() => import("@/pages/Products/ProductDetail"));
const Cart = lazy(() => import("@/pages/Cart/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout/Checkout"));
const Profile = lazy(() => import("@/pages/Profile/Profile"));
const Admin = lazy(() => import("@/pages/Admin/Admin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Abre el modal y redirige al home (o a la página anterior)
const AuthModalRoute: React.FC = () => {
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? ROUTES.HOME;
  const [open, setOpen] = React.useState(true);

  return (
    <>
      <Navigate to={from} replace />
      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
};

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Navbar />
    <CartSidebar />
    <Suspense fallback={<Loader fullPage />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.PRODUCTS} element={<Products />} />
        <Route path={ROUTES.PRODUCT_DETAIL} element={<ProductDetail />} />
        <Route path={ROUTES.CART} element={<Cart />} />

        {/* Auth — abre modal en lugar de página */}
        <Route path={ROUTES.LOGIN} element={<AuthModalRoute />} />
        <Route path={ROUTES.REGISTER} element={<AuthModalRoute />} />
        <Route path="/auth/recuperar" element={<AuthModalRoute />} />

        {/* Protected — requires login */}
        <Route element={<PrivateRoute />}>
          <Route path={ROUTES.CHECKOUT} element={<Checkout />} />
          <Route path={ROUTES.PROFILE} element={<Profile />} />
          <Route path={ROUTES.ORDERS} element={<Profile />} />
        </Route>

        {/* Protected — requires admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </Suspense>
    <Footer />
  </BrowserRouter>
);

export default AppRouter;