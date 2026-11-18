import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "../lib/api";

interface MeResponse {
  user: { id: string; name: string; email: string };
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("focusage-token"))
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("U");
  const [userName, setUserName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch the real user name/initial for the avatar.
  async function fetchUser() {
    if (!localStorage.getItem("focusage-token")) return;
    try {
      const data = await apiRequest<MeResponse>("/api/auth/me");
      const name = data.user.name || "";
      setUserName(name);
      setUserInitial(name.trim().charAt(0).toUpperCase() || "U");
    } catch {
      // Non-critical — keep default "U"
    }
  }

  useEffect(() => {
    if (isLoggedIn) void fetchUser();
  }, [isLoggedIn]);

  // Keep login state in sync when auth changes externally.
  useEffect(() => {
    function handleAuthChange() {
      const loggedIn = Boolean(localStorage.getItem("focusage-token"));
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setUserInitial("U");
        setUserName("");
      } else {
        void fetchUser();
      }
    }
    window.addEventListener("focusage-auth-change", handleAuthChange);
    return () => window.removeEventListener("focusage-auth-change", handleAuthChange);
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function handleLogout() {
    localStorage.removeItem("focusage-token");
    window.dispatchEvent(new Event("focusage-auth-change"));
    setIsLoggedIn(false);
    setDropdownOpen(false);
    navigate("/");
  }

  function navLinkStyle(path: string): React.CSSProperties {
    const active = location.pathname === path;
    return {
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      color: active ? "var(--text-primary)" : "var(--text-secondary)",
      textDecoration: "none",
      letterSpacing: "0.01em",
      transition: "color 0.12s",
      paddingBottom: 1,
      borderBottom: active ? "1.5px solid var(--text-primary)" : "1.5px solid transparent",
    };
  }

  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface-raised)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          Focusage
        </Link>

        {/* Navigation links */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link to="/" style={navLinkStyle("/")}>
            Home
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/dashboard" style={navLinkStyle("/dashboard")}>
                Dashboard
              </Link>

              {/* Profile avatar + dropdown */}
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                  title={userName || "Account"}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-light)",
                    color: "var(--accent)",
                    border: "1.5px solid var(--accent-ring)",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    letterSpacing: 0,
                    transition: "border-color 0.12s, background-color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-ring)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-light)";
                  }}
                >
                  {userInitial}
                </button>

                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      width: 168,
                      backgroundColor: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      boxShadow: "0 6px 20px rgba(0,0,0,0.09)",
                      zIndex: 50,
                      overflow: "hidden",
                      padding: "4px 0",
                    }}
                  >
                    {/* User info header */}
                    {userName && (
                      <div
                        style={{
                          padding: "10px 14px 8px",
                          borderBottom: "1px solid var(--border-soft)",
                          marginBottom: 4,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {userName}
                        </p>
                      </div>
                    )}

                    {/* Profile link */}
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "8px 14px",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        textDecoration: "none",
                        transition: "background-color 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--bg)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      Profile
                    </Link>

                    {/* Divider */}
                    <div
                      style={{
                        height: 1,
                        backgroundColor: "var(--border-soft)",
                        margin: "4px 0",
                      }}
                    />

                    {/* Log out */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 14px",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        transition: "background-color 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--bg)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
                textDecoration: "none",
                padding: "5px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--surface-raised)",
                transition: "background-color 0.12s",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--bg-inset)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--surface-raised)")
              }
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
