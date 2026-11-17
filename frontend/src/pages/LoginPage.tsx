import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

// Expected response from your existing backend login service.
interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

function LoginPage() {
  const navigate = useNavigate();

  // React state keeps track of what the user types.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // These states let us show feedback to the user.
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault(); // Prevent the browser's default form reload.

    setError("");
    setLoading(true);

try {
  // Send credentials to our existing Express login endpoint.
  const result = await apiRequest<LoginResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );

  // Save the JWT so apiRequest can attach it to protected requests.
  localStorage.setItem("focusage-token", result.token);

  // Notify other components that login happened.
  window.dispatchEvent(new Event("focusage-auth-change"));

  // Return the user to the home page after successful login.
  navigate("/");
    } catch (err) {
      // Display the backend's error message when available.
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );
    } finally {
      // Re-enable the button whether login succeeds or fails.
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Focusage
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Focus better. Get things done.
          </p>
        </div>

        {/* Submit the form through our login handler. */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          {/* Show API errors without removing the form. */}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <a
            href="/register"
            className="font-medium text-slate-900 hover:underline"
          >
            Register
          </a>
        </p>
      </div>
    </main>
  );
}

export default LoginPage;