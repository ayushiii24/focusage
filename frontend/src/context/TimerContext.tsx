import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "../lib/api";
import { ambientSound } from "../components/FocusMode/soundEngine";
import { AMBIENCES, type AmbienceId } from "../components/FocusMode/ambiences";

export type TimerMode = "work" | "break";

export const DURATIONS: Record<TimerMode, number> = {
  work: 25 * 60, // 25 mims
  break: 5 * 60, // 5 mins
};

interface SoundVolumes {
  rain: number;
  wind: number;
  fire: number;
  cafe: number;
  lofi: number;
  master: number;
}

interface TimerContextType {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  isExpanded: boolean;
  selectedAmbience: AmbienceId;
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  soundVolumes: SoundVolumes;
  isMuted: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  switchMode: (newMode: TimerMode) => void;
  setIsExpanded: (expanded: boolean) => void;
  setSelectedAmbience: (id: AmbienceId) => void;
  updateSoundVolume: (key: keyof SoundVolumes, value: number) => void;
  toggleMute: () => void;
  setActiveTask: (id: string | null, title: string | null) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface AuthIdentity {
  token: string | null;
  generation: number;
}

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState<number>(DURATIONS.work);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(null);

  //ambience preference
  const [selectedAmbience, setSelectedAmbienceState] = useState<AmbienceId>(() => {
    try {
      const saved = localStorage.getItem("focusage-ambience");
      return (saved && saved in AMBIENCES ? saved : "rainy-night") as AmbienceId;
    } catch {
      return "rainy-night";
    }
  });

  const [soundVolumes, setSoundVolumes] = useState<SoundVolumes>(() => {
    const amb = AMBIENCES[selectedAmbience] || AMBIENCES["rainy-night"];
    return {
      rain: amb.defaultSounds.rain,
      wind: amb.defaultSounds.wind,
      fire: amb.defaultSounds.fire,
      cafe: amb.defaultSounds.cafe,
      lofi: amb.defaultSounds.lofi,
      master: 0.7,
    };
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const authIdentityRef = useRef<AuthIdentity>({ token: localStorage.getItem("focusage-token"), generation: 0 });
  const sessionRecordedRef = useRef<boolean>(false);
  const serverSessionActiveRef = useRef(false);
  const serverSessionPausedRef = useRef(false);
  const sessionRequestQueueRef = useRef<Promise<void>>(Promise.resolve());
  const countdownIntervalRef = useRef<number | null>(null);
  const activityIntervalRef = useRef<number | null>(null);

  const queueSessionRequest = useCallback((path: string, body?: unknown, identity = authIdentityRef.current, allowAfterAuthChange = false) => {
    if (!identity.token) return Promise.resolve(false);
    const request = sessionRequestQueueRef.current.then(async () => {
      const current = authIdentityRef.current;
      if (!allowAfterAuthChange && (current.generation !== identity.generation || current.token !== identity.token || localStorage.getItem("focusage-token") !== identity.token)) {
        return false;
      }
      await apiRequest(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
        authToken: identity.token,
      });
      return true;
    });
    const handledRequest = request.catch((err) => {
      console.error("Focus session sync failed:", err);
      return false;
    });
    sessionRequestQueueRef.current = handledRequest.then(() => undefined);
    return handledRequest;
  }, []);

  const beginOrResumeServerSession = useCallback(() => {
    const identity = authIdentityRef.current;
    if (!identity.token || localStorage.getItem("focusage-token") !== identity.token) return;
    if (serverSessionActiveRef.current) {
      if (serverSessionPausedRef.current) {
        serverSessionPausedRef.current = false;
        void queueSessionRequest("/api/focus-sessions/resume", undefined, identity);
      }
      return;
    }
    serverSessionActiveRef.current = true;
    void queueSessionRequest("/api/focus-sessions/start", activeTaskId ? { taskId: activeTaskId } : {}, identity);
  }, [activeTaskId, queueSessionRequest]);

  const pauseServerSession = useCallback(() => {
    if (!serverSessionActiveRef.current || serverSessionPausedRef.current) return;
    serverSessionPausedRef.current = true;
    void queueSessionRequest("/api/focus-sessions/pause");
  }, [queueSessionRequest]);

  //helper to sync user activity status with backend
  const syncActivityStatus = useCallback(async (status: "Focusing" | "On Break" | "Offline") => {
    const identity = authIdentityRef.current;
    if (!identity.token || localStorage.getItem("focusage-token") !== identity.token) return;
    try {
      await apiRequest("/api/friends/activity-status", {
        method: "POST",
        body: JSON.stringify({ activityStatus: status }),
        authToken: identity.token,
      });
    } catch {
      //bg sync
    }
  }, []);

  //sync status when running state or mode changes
  useEffect(() => {
    const identity = authIdentityRef.current;
    if (!identity.token || localStorage.getItem("focusage-token") !== identity.token) return;

    if (isRunning) {
      void syncActivityStatus(mode === "work" ? "Focusing" : "On Break");
    } else {
      void syncActivityStatus("Offline");
    }
  }, [isRunning, mode, syncActivityStatus]);

  //periodic heartbeat while active
  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      void syncActivityStatus(mode === "work" ? "Focusing" : "On Break");
    }, 60000);
    activityIntervalRef.current = interval;
    return () => {
      window.clearInterval(interval);
      if (activityIntervalRef.current === interval) activityIntervalRef.current = null;
    };
  }, [isRunning, mode, syncActivityStatus]);

  //complete only the server-owned session for the account that started it
  const recordCompletedSession = useCallback(async () => {
    const identity = authIdentityRef.current;
    if (!identity.token || !serverSessionActiveRef.current) return;

    const completed = await queueSessionRequest("/api/focus-sessions/complete", undefined, identity);
    const current = authIdentityRef.current;
    if (!completed || current.generation !== identity.generation || current.token !== identity.token) return;
    serverSessionPausedRef.current = false;
    serverSessionActiveRef.current = false;
    window.dispatchEvent(new Event("focusage-session-complete"));
  }, [queueSessionRequest]);

  useEffect(() => {
    const syncAuthBoundary = () => {
      const nextToken = localStorage.getItem("focusage-token");
      const previous = authIdentityRef.current;
      if (nextToken === previous.token) return;

      authIdentityRef.current = { token: nextToken, generation: previous.generation + 1 };
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (activityIntervalRef.current !== null) {
        window.clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }

      if (previous.token && serverSessionActiveRef.current) {
        void queueSessionRequest("/api/focus-sessions/abandon", undefined, previous, true);
      }
      serverSessionActiveRef.current = false;
      serverSessionPausedRef.current = false;
      sessionRecordedRef.current = false;

      const storedAmbience = localStorage.getItem("focusage-ambience");
      const freshAmbience = (storedAmbience && storedAmbience in AMBIENCES ? storedAmbience : "rainy-night") as AmbienceId;
      const defaults = AMBIENCES[freshAmbience].defaultSounds;
      ambientSound.reset();
      setMode("work");
      setSecondsLeft(DURATIONS.work);
      setIsRunning(false);
      setIsExpanded(false);
      setActiveTaskId(null);
      setActiveTaskTitle(null);
      setSelectedAmbienceState(freshAmbience);
      setSoundVolumes({ ...defaults, master: 0.7 });
      setIsMuted(false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "focusage-token") syncAuthBoundary();
    };
    window.addEventListener("focusage-auth-change", syncAuthBoundary);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focusage-auth-change", syncAuthBoundary);
      window.removeEventListener("storage", handleStorage);
    };
  }, [queueSessionRequest]);

  useEffect(() => () => {
    if (countdownIntervalRef.current !== null) window.clearInterval(countdownIntervalRef.current);
    if (activityIntervalRef.current !== null) window.clearInterval(activityIntervalRef.current);
    ambientSound.reset();
  }, []);

  //single countdown interval; the auth boundary can also clear it synchronously
  useEffect(() => {
    if (!isRunning) return;
    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    countdownIntervalRef.current = intervalId;
    return () => {
      window.clearInterval(intervalId);
      if (countdownIntervalRef.current === intervalId) countdownIntervalRef.current = null;
    };
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return;

    setIsRunning(false);

    if (mode === "work" && !sessionRecordedRef.current) {
      sessionRecordedRef.current = true;
      void recordCompletedSession();
    }
  }, [secondsLeft, isRunning, mode, recordCompletedSession]);

  const startTimer = useCallback(() => {
    if (secondsLeft === 0) {
      setSecondsLeft(DURATIONS[mode]);
      sessionRecordedRef.current = false;
    }
    if (mode === "work") beginOrResumeServerSession();
    setIsRunning(true);
  }, [secondsLeft, mode, beginOrResumeServerSession]);

  const pauseTimer = useCallback(() => {
    if (mode === "work") pauseServerSession();
    setIsRunning(false);
  }, [mode, pauseServerSession]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    if (mode === "work" && secondsLeft > 0) pauseServerSession();
    setIsRunning(false);
    setSecondsLeft(DURATIONS[mode]);
    sessionRecordedRef.current = false;
  }, [mode, secondsLeft, pauseServerSession]);

  const switchMode = useCallback((newMode: TimerMode) => {
    if (mode === "work" && newMode !== "work" && secondsLeft > 0) pauseServerSession();
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(DURATIONS[newMode]);
    sessionRecordedRef.current = false;
  }, [mode, secondsLeft, pauseServerSession]);


  const setSelectedAmbience = useCallback((id: AmbienceId) => {
    setSelectedAmbienceState(id);
    localStorage.setItem("focusage-ambience", id);
    const amb = AMBIENCES[id];
    if (amb) {
      const newVols: SoundVolumes = {
        rain: amb.defaultSounds.rain,
        wind: amb.defaultSounds.wind,
        fire: amb.defaultSounds.fire,
        cafe: amb.defaultSounds.cafe,
        lofi: amb.defaultSounds.lofi,
        master: soundVolumes.master,
      };
      setSoundVolumes(newVols);

      ambientSound.setRainVolume(newVols.rain);
      ambientSound.setWindVolume(newVols.wind);
      ambientSound.setFireVolume(newVols.fire);
      ambientSound.setCafeVolume(newVols.cafe);
      ambientSound.setLofiVolume(newVols.lofi);
    }
  }, [soundVolumes.master]);

  const updateSoundVolume = useCallback((key: keyof SoundVolumes, value: number) => {
    const volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    setSoundVolumes((prev) => ({ ...prev, [key]: volume }));
    if (key === "rain") ambientSound.setRainVolume(volume);
    if (key === "wind") ambientSound.setWindVolume(volume);
    if (key === "fire") ambientSound.setFireVolume(volume);
    if (key === "cafe") ambientSound.setCafeVolume(volume);
    if (key === "lofi") ambientSound.setLofiVolume(volume);
    if (key === "master") ambientSound.setMasterVolume(volume);
  }, []);

  const toggleMute = useCallback(() => {
    const muted = ambientSound.toggleMute(soundVolumes.master);
    setIsMuted(muted);
    if (!muted) {
      ambientSound.setRainVolume(soundVolumes.rain);
      ambientSound.setWindVolume(soundVolumes.wind);
      ambientSound.setFireVolume(soundVolumes.fire);
      ambientSound.setCafeVolume(soundVolumes.cafe);
      ambientSound.setLofiVolume(soundVolumes.lofi);
    }
  }, [soundVolumes]);

  const setActiveTask = useCallback((id: string | null, title: string | null) => {
    setActiveTaskId(id);
    setActiveTaskTitle(title);
  }, []);

  return (
    <TimerContext.Provider
      value={{
        mode,
        secondsLeft,
        isRunning,
        isExpanded,
        selectedAmbience,
        activeTaskId,
        activeTaskTitle,
        soundVolumes,
        isMuted,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        switchMode,
        setIsExpanded,
        setSelectedAmbience,
        updateSoundVolume,
        toggleMute,
        setActiveTask,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export function useTimer(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
