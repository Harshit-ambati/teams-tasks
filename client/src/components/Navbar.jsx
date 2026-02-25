import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png"; 
import "../styles/Navbar.css";

export default function Navbar({ className = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      setUser(null);
      return;
    }

    try {
      setUser(JSON.parse(savedUser));
    } catch {
      setUser(null);
    }
  }, [location.pathname]);

  const userInitials = useMemo(() => {
    const name = (user?.name || "").trim();
    if (!name) return "U";

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <header className={`app-navbar ${className}`.trim()}>
      <div className="container navbar-inner">
        <div className="brand-wrap">
          <Link to="/" className="brand">
            <img src={logo} alt="Teams & Tasks" className="logo" data-splash-target="logo" />
          </Link>
        </div>

        <nav className="nav-links">
          {!user ? (
            <>
              <Link to="/signup" className="nav-link">Sign up</Link>
              <Link to="/login" className="nav-link nav-cta">Login</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/projects" className="nav-link">Projects</Link>
              <Link to="/teams" className="nav-link">Teams</Link>
              <Link to="/tasks" className="nav-link">Tasks</Link>
              <div className="user-profile">
                <div className="user-avatar" aria-hidden>
                  {userInitials}
                </div>
                <div className="user-meta">
                  <p className="user-name">{user.name || "User"}</p>
                  <p className="user-email">{user.email || ""}</p>
                </div>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
