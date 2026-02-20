import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/logo.png';
import '../styles/Login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="Teams and Tasks" className="login-logo" />
        <h2>Login</h2>
        <p className="login-subtitle">Access your projects, teams, and tasks.</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="already-account">
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </p>
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
