import clsx from "clsx";
import { useLangStore, type Lang } from "../i18n/store";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو" },
];

/** Works in both directions. Each label is always written in its own language. */
export function LanguageSwitch({ className }: { className?: string }) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div
      dir="ltr"
      role="group"
      aria-label="Language / زبان"
      className={clsx("inline-flex rounded-control border border-gray-200 bg-gray-50 p-0.5", className)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          aria-pressed={lang === option.value}
          className={clsx(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            lang === option.value ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}