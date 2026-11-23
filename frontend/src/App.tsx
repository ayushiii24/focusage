import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import FocusPage from "./pages/FocusPage";
import StudyPlanPage from "./pages/StudyPlanPage";
import FriendsPage from "./pages/FriendsPage";
import { TimerProvider } from "./context/TimerContext";
import { FocusModeExpanded } from "./components/FocusMode/FocusModeExpanded";
import { ToastProvider } from "./context/ToastContext";

function App() {
  const isStudyPlanEnabled =
    import.meta.env.VITE_ENABLE_STUDY_PLAN === "true";
  return (
    <ToastProvider>
      <TimerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/focus" element={<FocusPage />} />
            {isStudyPlanEnabled && (
              <Route path="/study-plan" element={<StudyPlanPage />} />
            )}
            {/*<Route path="/study-plan" element={<StudyPlanPage />} /> */}
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          <FocusModeExpanded />
        </BrowserRouter>
      </TimerProvider>
    </ToastProvider>
  );
}

export default App;
