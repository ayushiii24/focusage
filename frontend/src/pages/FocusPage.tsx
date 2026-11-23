import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTimer } from "../context/TimerContext";

export default function FocusPage() {
  const { setIsExpanded } = useTimer();
  const navigate = useNavigate();

  useEffect(() => {
    setIsExpanded(true);
    navigate("/", { replace: true });
  }, [setIsExpanded, navigate]);

  return null;
}
