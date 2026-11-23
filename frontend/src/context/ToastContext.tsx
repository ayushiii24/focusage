import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ToastVariant = "success" | "error" | "info";
type ToastInput = { message: string; variant?: ToastVariant; duration?: number };
type ToastItem = ToastInput & { id: number };
const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback((input: ToastInput) => setItems((current) => [...current, { ...input, id: Date.now() + Math.random() }]), []);
  useEffect(() => {
    const timers = items.map((item) => window.setTimeout(() => dismiss(item.id), item.duration ?? 4500));
    return () => timers.forEach(window.clearTimeout);
  }, [items, dismiss]);
  return <ToastContext.Provider value={toast}>
    {children}
    <div className="toast-region" aria-live="polite" aria-relevant="additions">
      {items.map((item) => <div key={item.id} className={`app-toast app-toast-${item.variant ?? "info"}`} role={item.variant === "error" ? "alert" : "status"}>
        <span>{item.message}</span><button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}>×</button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used within ToastProvider");
  return toast;
}
