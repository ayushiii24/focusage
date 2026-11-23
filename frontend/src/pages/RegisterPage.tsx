import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { AuthAside } from "./LoginPage";
import { useToast } from "../context/ToastContext";

interface RegisterResponse {
  message: string;
  user: { id: string; name: string; email: string; username: string };
}

function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter your name to create an account.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError("Username must be 3–20 letters, numbers or underscores.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), username: username.trim().toLowerCase(), email: email.trim(), password }),
      });
      navigate("/login?registered=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
      if (/username is already taken/i.test(message)) toast({ message: "That username is already taken. Choose another one.", variant: "error" });
      else if (/user already exists/i.test(message)) toast({ message: "An account with that email already exists.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return <div className="auth-page">
    <AuthAside />
    <main className="auth-main">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><Link to="/" className="auth-brand"><span className="brand-mark" aria-hidden="true">f</span>Focusage</Link></div>
        <header className="auth-title">
          <h2>Create your account</h2>
        </header>
        <form className="auth-form" onSubmit={handleRegister}>
          <div className="auth-field"><label htmlFor="name">Name</label><input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          <div className="auth-field"><label htmlFor="username">Username</label><input id="username" type="text" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => setUsername((value) => value.trim())} placeholder="e.g. i_study" /><span className="auth-field-hint">3–20 letters, numbers, or underscores. Searchable by friends.</span></div>
          <div className="auth-field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="auth-field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" required aria-describedby="password-hint" aria-invalid={Boolean(error && error.toLowerCase().includes("password"))} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="*******" /><span id="password-hint" className="auth-field-hint">Use at least 8 characters, including a letter and a number.</span></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
        <Link className="auth-back" to="/">← Back to home</Link>
      </div>
    </main>
  </div>;
}

export default RegisterPage;
