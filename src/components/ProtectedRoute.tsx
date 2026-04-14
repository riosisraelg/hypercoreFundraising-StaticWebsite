import { Navigate, Outlet } from "react-router-dom";
import { getToken, api, UserProfile } from "../lib/api";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const token = getToken();
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    if (token && adminOnly) {
      api.get<UserProfile>("/auth/me", true)
         .then(profile => setIsStaff(profile.is_staff))
         .catch(() => setIsStaff(false));
    }
  }, [token, adminOnly]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (adminOnly) {
    if (isStaff === null) return <div>Verificando permisos...</div>;
    if (!isStaff) return <Navigate to="/user/dashboard" replace />;
  }

  return <Outlet />;
}
