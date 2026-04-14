import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getToken, clearToken, api, UserProfile } from "../lib/api";
import { useEffect, useState, useRef } from "react";

export default function PublicLayout() {
  const navigate = useNavigate();
  const token = getToken();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      api.get<UserProfile>("/auth/me", true)
        .then(setUser)
        .catch(() => {
          clearToken();
          setUser(null);
        });
    } else {
      setUser(null);
    }
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleScroll() {
      setIsMenuOpen(false);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setIsProfileOpen(false);
    setIsMenuOpen(false);
    navigate("/");
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  return (
    <div className="public-layout">
      <header className="public-header">
        <nav className="public-nav" aria-label="Navegación principal">
          <NavLink to="/" className="nav-brand" onClick={() => setIsMenuOpen(false)}>
            HyperCore Sorteo
          </NavLink>

          <button 
            className="nav-toggle" 
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>

          <div className={`nav-links-wrapper ${isMenuOpen ? "open" : ""}`}>
            <ul className="nav-links" role="list">
              <li>
                <NavLink to="/" end onClick={() => setIsMenuOpen(false)}>
                  Inicio
                </NavLink>
              </li>
              <li>
                <NavLink to="/about" onClick={() => setIsMenuOpen(false)}>Nosotros</NavLink>
              </li>
              <li>
                <NavLink to="/results" onClick={() => setIsMenuOpen(false)}>Resultados</NavLink>
              </li>
              <li>
                <NavLink to="/validate" onClick={() => setIsMenuOpen(false)}>Validar</NavLink>
              </li>
              <li>
                <NavLink to="/privacy" onClick={() => setIsMenuOpen(false)}>Privacidad</NavLink>
              </li>
            </ul>

            <div className="nav-auth">
              {token && user ? (
                <div className="profile-container" ref={dropdownRef}>
                  <button className="profile-trigger" onClick={toggleProfile}>
                    <span>{user.first_name || user.username.split('@')[0]}</span>
                    <span style={{ fontSize: '0.7em' }}>{isProfileOpen ? "▲" : "▼"}</span>
                  </button>
                  
                  {isProfileOpen && (
                    <div className="profile-dropdown">
                      <NavLink 
                        to="/user/dashboard" 
                        className="dropdown-item"
                        onClick={() => { setIsProfileOpen(false); setIsMenuOpen(false); }}
                      >
                        🏠 Mi Panel
                      </NavLink>
                      {user.is_staff && (
                        <NavLink 
                          to="/admin/dashboard" 
                          className="dropdown-item"
                          onClick={() => { setIsProfileOpen(false); setIsMenuOpen(false); }}
                        >
                          ⚙️ Administración
                        </NavLink>
                      )}
                      <div className="dropdown-divider"></div>
                      <button className="dropdown-item" onClick={handleLogout}>
                        🚪 Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink 
                  to="/login" 
                  className="btn-primary" 
                  style={{ padding: "0.45rem 1.25rem" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Ingresar
                </NavLink>
              )}
            </div>
          </div>
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
