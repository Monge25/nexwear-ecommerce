import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartSidebar from "@/components/layout/Sidebar";
import Loader from "@/components/ui/Loader";
import PrivateRoute from "./PrivateRoute";
import AdminRoute from "./AdminRoute";
import { ROUTES } from "@/utils/constants";

const Home = lazy(() => import("@/pages/Home/Home"));
const Products = lazy(() => import("@/pages/Products/Products"));
const ProductDetail = lazy(() => import("@/pages/Products/ProductDetail"));
const Cart = lazy(() => import("@/pages/Cart/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout/Checkout"));
const Login = lazy(() => import("@/pages/Auth/Login"));
const Register = lazy(() => import("@/pages/Auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/Auth/ForgotPassword"));
const Profile = lazy(() => import("@/pages/Profile/Profile"));
const Admin = lazy(() => import("@/pages/Admin/Admin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path="/auth/recuperar" element={<ForgotPassword />} />
        {/* Protected — requires login */}
        <Route element={<PrivateRoute />}>
          <Route path={ROUTES.CHECKOUT} element={<Checkout />} />
          <Route path={ROUTES.PROFILE} element={<Profile />} />
          <Route path={ROUTES.ORDERS} element={<Profile />} />
        </Route>
        {/* Protected — requires admin role */}
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
