import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";

const PrivateRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullPage />;
  if (!isAuthenticated)
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  return <Outlet />;
};

export default PrivateRoute;
