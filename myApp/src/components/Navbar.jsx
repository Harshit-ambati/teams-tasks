import { Link } from "react-router-dom";
import logo from "../assets/logo.png"; 
import "../styles/Navbar.css";

export default function Navbar() {
  return (
    <header className="app-navbar">
      <div className="container navbar-inner">
        <div className="brand-wrap">
          <Link to="/" className="brand">
            <img src={logo} alt="Teams & Tasks" className="logo" />
          </Link>
        </div>

        <nav className="nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/tasks" className="nav-link">Tasks</Link>
          <Link to="/signup" className="nav-link">Sign up</Link>
          <Link to="/login" className="nav-link nav-cta">Login</Link>
        </nav>
      </div>
    </header>
  );
}
