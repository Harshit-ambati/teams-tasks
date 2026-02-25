import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../api/authApi';
import { setAuth } from '../utils/authStorage';
import logo from '../assets/logo.png';
import '../styles/Login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await authApi.login({
        email: email.trim(),
        password,
      });

      setAuth({ token: data.token, user: data.user });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="form-error">{error}</div>}
          <p className="already-account">
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </p>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
