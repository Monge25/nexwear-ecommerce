import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";

const AdminRoute: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Loader fullPage />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (user?.role !== "Admin") return <Navigate to="/" replace />;
  return <Outlet />;
};

export default AdminRoute;
