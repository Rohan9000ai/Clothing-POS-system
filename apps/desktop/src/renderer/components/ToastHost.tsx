import { X } from "lucide-react";
import clsx from "clsx";
import { useToastStore } from "../store/toastStore";

export function ToastHost() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "pointer-events-auto flex items-start justify-between gap-3 rounded-control border px-4 py-3 text-sm shadow-lg",
            toast.tone === "success"
              ? "border-success/30 bg-success-light text-success"
              : "border-danger/30 bg-danger-light text-danger"
          )}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}