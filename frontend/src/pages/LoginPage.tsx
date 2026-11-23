import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api";

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string };
}

function AuthBrand() {
  return <Link to="/" className="site-brand"><img className="brand-mark" src="f4.png" /><span>Focusage</span></Link>
}

export function AuthAside() {
  return <aside className="auth-aside">
    <AuthBrand />
    <div className="auth-aside-copy">
      <h1>A calmer way to make progress.</h1>
      <p>Bring your tasks, focus sessions and study plans into one thoughtful workspace.</p>
    </div>
    <p className="auth-aside-footer">A little progress, consistently.</p>
  </aside>;
}

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      localStorage.setItem("focusage-token", result.token);
      window.dispatchEvent(new Event("focusage-auth-change"));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="auth-page">
    <AuthAside />
    <main className="auth-main">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><AuthBrand /></div>
        <header className="auth-title">
          <p className="eyebrow">Welcome back</p>
          <h2>Log in to Focusage</h2>
          <p>Pick up where you left off.</p>
        </header>
        {searchParams.get("registered") === "1" && <p className="auth-notice" role="status">Your account is ready. Log in to get started.</p>}
        {searchParams.get("expired") === "1" && <p className="auth-notice" role="status">Your session has expired. Please log in again.</p>}
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="auth-field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Logging in…" : "Log in"}</button>
        </form>
        <p className="auth-switch"> <Link to="/register">Create an account</Link></p>
        <Link className="auth-back" to="/">← Back to home</Link>
      </div>
    </main>
  </div>;
}

export default LoginPage;
