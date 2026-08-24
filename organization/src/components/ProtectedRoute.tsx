import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import NotAuthorized from "@/pages/NotAuthorized";
/** Two gates: signed in at all, then authorised for this particular path. */
export function ProtectedRoute(){
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
