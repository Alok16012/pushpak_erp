import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Two gates: signed in at all, then authorised for this particular path.
 *
 * The session is restored asynchronously, so the first render of a hard reload
 * always has `user === null`. Redirecting on that render would bounce a signed-in
 * person to the login screen and then on to their home page — losing the page
 * they actually reloaded. Wait for `loading` to settle first, and remember where
 * they were headed so the login can return them there.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
