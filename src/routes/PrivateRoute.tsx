import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";
import { ROUTES } from "@/utils/constants";

const PrivateRoute: React.FC = () => {
  const { isAuthenticated, loading, hydrated } = useAuth();
  const location = useLocation();

  if (!hydrated || loading) return <Loader fullPage />;
  if (!isAuthenticated)
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  return <Outlet />;
};

export default PrivateRoute;