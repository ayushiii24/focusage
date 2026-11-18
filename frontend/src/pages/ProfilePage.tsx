import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiRequest } from "../lib/api";

interface UserProfile {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MeResponse {
  user: UserProfile;
}

function ProfilePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("focusage-token");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Protect route: redirect guests to login
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let isMounted = true;

    async function fetchUserProfile() {
      try {
        const response = await apiRequest<MeResponse>("/api/auth/me");
        if (isMounted) {
          setUser(response.user);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load profile details";
          setError(message);
          // If token is invalid or expired, clear and redirect
          if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("token")) {
            localStorage.removeItem("focusage-token");
            window.dispatchEvent(new Event("focusage-auth-change"));
            navigate("/login", { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  function handleLogout() {
    localStorage.removeItem("focusage-token");
    window.dispatchEvent(new Event("focusage-auth-change"));
    navigate("/");
  }

  // Derive display initial
  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

  // Format created date if validly provided by backend
  const formattedCreatedDate = (() => {
    if (!user?.createdAt) return null;
    try {
      const date = new Date(user.createdAt);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  })();

  const userId = user?._id || user?.id || null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: 680,
          width: "100%",
          margin: "0 auto",
          padding: "44px 24px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Navigation Breadcrumb / Back link */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 4,
              }}
            >
              Account
            </p>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              My Profile
            </h1>
          </div>

          <Link
            to="/dashboard"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-raised)",
              transition: "background-color 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-inset)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--surface-raised)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            ← View Dashboard
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Loading profile information…
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            style={{
              backgroundColor: "var(--danger-bg)",
              border: "1px solid #f5c2c2",
              borderRadius: 10,
              padding: "20px 24px",
              color: "var(--danger)",
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p style={{ fontWeight: 500 }}>Unable to load your profile</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>{error}</p>
            <div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Log out and sign in again
              </button>
            </div>
          </div>
        )}

        {/* Profile Content */}
        {!loading && user && (
          <>
            {/* Header Identity Card */}
            <section
              style={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "28px 28px 26px",
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-light)",
                  color: "var(--accent)",
                  border: "2px solid var(--accent-ring)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 600,
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(114, 96, 200, 0.08)",
                }}
              >
                {initial}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {user.name}
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 12,
                      backgroundColor: "var(--accent-light)",
                      color: "var(--accent)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Member
                  </span>
                </div>

                {user.email && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                      wordBreak: "break-all",
                    }}
                  >
                    {user.email}
                  </p>
                )}

                {formattedCreatedDate && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 6,
                    }}
                  >
                    Member since {formattedCreatedDate}
                  </p>
                )}
              </div>
            </section>

            {/* Account Details Breakdown Card */}
            <section
              style={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid var(--border-soft)",
                  backgroundColor: "var(--bg-inset)",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  Account Information
                </h3>
              </div>

              <div style={{ padding: "8px 24px" }}>
                {/* Full Name Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border-soft)",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                    Full Name
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {user.name}
                  </span>
                </div>

                {/* Email Address Row (only if present) */}
                {user.email && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 1fr",
                      padding: "14px 0",
                      borderBottom: "1px solid var(--border-soft)",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      Email Address
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", wordBreak: "break-all" }}>
                      {user.email}
                    </span>
                  </div>
                )}

                {/* Account ID Row (only if present) */}
                {userId && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 1fr",
                      padding: "14px 0",
                      borderBottom: formattedCreatedDate ? "1px solid var(--border-soft)" : "none",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      Account ID
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "var(--text-muted)",
                      }}
                    >
                      {userId}
                    </span>
                  </div>
                )}

                {/* Account Created Date (only if present) */}
                {formattedCreatedDate && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 1fr",
                      padding: "14px 0",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      Joined Date
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                      {formattedCreatedDate}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Session Management / Log Out Card */}
            <section
              style={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  Session
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  End your current session on this device.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  backgroundColor: "var(--surface-raised)",
                  color: "#b91c1c",
                  border: "1px solid #f0b0b0",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  transition: "background-color 0.12s, border-color 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--danger-bg)";
                  e.currentTarget.style.borderColor = "#e68a8a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--surface-raised)";
                  e.currentTarget.style.borderColor = "#f0b0b0";
                }}
              >
                Log out
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default ProfilePage;
