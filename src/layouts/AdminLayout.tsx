import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/api";

export default function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="sidebar-brand">HyperCore Admin</h2>
        <nav aria-label="Navegación admin">
          <ul className="sidebar-links" role="list">
            <li>
              <NavLink to="/admin/dashboard">Dashboard</NavLink>
            </li>
            <li>
              <NavLink to="/admin/tickets" end>
                Boletos
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/tickets/new">Registrar Boleto</NavLink>
            </li>
            <li>
              <NavLink to="/admin/verify">Validar Boleto</NavLink>
            </li>
            <li>
              <NavLink to="/admin/draw">Sorteo</NavLink>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
