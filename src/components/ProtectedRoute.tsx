import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../lib/api";

/**
 * Wraps admin routes — redirects to login if no token is present.
 * Token validity is checked server-side; 401 responses are handled
 * globally by the API client (see api.ts).
 */
export default function ProtectedRoute() {
  const token = getToken();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
