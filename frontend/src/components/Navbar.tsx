import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

interface MeResponse { user: { id: string; name: string; email: string } }

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("focusage-token")));
  const [userName, setUserName] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    void apiRequest<MeResponse>("/api/auth/me").then(({ user }) => {
      if (active) setUserName(user.name || "");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [isLoggedIn]);

  useEffect(() => {
    const syncAuth = () => {
      const loggedIn = Boolean(localStorage.getItem("focusage-token"));
      setIsLoggedIn(loggedIn);
      if (!loggedIn) setUserName("");
    };
    window.addEventListener("focusage-auth-change", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("focusage-auth-change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function logout() {
    localStorage.removeItem("focusage-token");
    window.dispatchEvent(new Event("focusage-auth-change"));
    setIsLoggedIn(false);
    setAccountOpen(false);
    navigate("/");
  }

  const isStudyPlanEnabled = import.meta.env.VITE_ENABLE_STUDY_PLAN === "true";

  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? " is-active" : ""}`;
  const links = <>
    <NavLink to="/" end className={navClass}>Home</NavLink>
    {isLoggedIn && <>
      <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
      {isStudyPlanEnabled && (
        <NavLink to="/study-plan" className={navClass}>
          Study plan
        </NavLink>
      )}
      {/*  <NavLink to="/study-plan" className={navClass}>Study plan</NavLink>*/}
      <NavLink to="/friends" className={navClass}>Friends</NavLink>
      <NavLink to="/profile" className={navClass}>Profile</NavLink>
    </>}
  </>;

  return <header className="site-header">
    <nav className="site-nav" aria-label="Main navigation">
      <Link to="/" className="site-brand"><img className="brand-mark" src="f4.png" /><span>Focusage</span></Link>
      <div className="nav-links">{links}</div>
      <div className="nav-actions">
        {isLoggedIn ? <div className="account-menu" ref={accountRef}>
          <button className="account-trigger" type="button" onClick={() => setAccountOpen((open) => !open)} aria-label="Account menu" aria-expanded={accountOpen} title={userName || "Account"}>{userName.trim().charAt(0).toUpperCase() || "U"}</button>
          {accountOpen && <div className="account-dropdown">
            {userName && <span className="account-name">{userName}</span>}
            <Link to="/profile" onClick={() => setAccountOpen(false)}>Profile</Link>
            <button type="button" onClick={logout}>Log out</button>
          </div>}
        </div> : <>
          <Link className="nav-login" to="/login">Log in</Link>
          <Link className="nav-signup" to="/register">Sign up</Link>
        </>}
        <button className="mobile-menu-toggle" type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen}>
          <span /><span />
        </button>
      </div>
      {mobileOpen && <div className="mobile-nav-panel">
        <div className="mobile-nav-links">{links}</div>
        {!isLoggedIn && <div className="mobile-auth-links"><Link to="/login">Log in</Link><Link className="nav-signup" to="/register">Create account</Link></div>}
        {isLoggedIn && <button className="mobile-logout" type="button" onClick={logout}>Log out</button>}
      </div>}
    </nav>
  </header>;
}

export default Navbar;
