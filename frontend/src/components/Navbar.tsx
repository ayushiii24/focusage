import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Navbar() {
  const navigate = useNavigate();

  // Check whether a login token exists.
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("focusage-token"))
  );

function handleLogout() {
  // Remove the account's authentication token.
  localStorage.removeItem("focusage-token");

  // Notify other components that logout happened.
  window.dispatchEvent(new Event("focusage-auth-change"));

  setIsLoggedIn(false);
  navigate("/");
}

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        {/* Focusage logo / brand */}
        <Link to="/" className="text-xl font-bold text-slate-900">
          Focusage
        </Link>

        {/* Main navigation */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Home
          </Link>

          <Link
            to="/tasks"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Tasks
          </Link>

          <Link
            to="/focus"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Focus
          </Link>

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;