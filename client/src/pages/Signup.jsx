import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const usersRaw = localStorage.getItem("users") || "[]";
    const users = JSON.parse(usersRaw);
    users.push({ id: Date.now(), name, email });
    localStorage.setItem("users", JSON.stringify(users));

    navigate("/dashboard");
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h2 style={{color: "black"}}>Create your account</h2>
        <p className="muted">Start managing tasks and projects.</p>
        <form onSubmit={handleSignup} className="signup-form">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary">Sign up</button>
        </form>
      </div>
    </div>
  );
}
