import { NavLink, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <nav className="public-nav" aria-label="Navegación principal">
          <NavLink to="/" className="nav-brand">
            HyperCore Sorteo
          </NavLink>
          <ul className="nav-links" role="list">
            <li>
              <NavLink to="/" end>
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink to="/about">Nosotros</NavLink>
            </li>
            <li>
              <NavLink to="/results">Resultados</NavLink>
            </li>
            <li>
              <NavLink to="/privacy">Privacidad</NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>
          &copy; {new Date().getFullYear()} Team HyperCore — Universidad
          Tecmilenio
        </p>
      </footer>
    </div>
  );
}
