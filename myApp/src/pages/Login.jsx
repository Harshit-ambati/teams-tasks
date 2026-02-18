import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Dummy login
    if (email && password) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="login">
      <h2>Login to Teams & Tasks</h2>

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
        <p className = "already-account">Don't have an account? <a href="/signup">Sign up</a></p>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;