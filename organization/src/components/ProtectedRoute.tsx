import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/lib/navigation";
import NotAuthorized from "@/pages/NotAuthorized";
/** Two gates: signed in at all, then authorised for this particular path. */
export function ProtectedRoute(){const {user,view}=useAuth();const {pathname}=useLocation();if(!user)return <Navigate to="/login" replace/>;return canAccess(view,pathname)?<Outlet/>:<NotAuthorized/>}
