import { useCallback } from "react";
import { create } from "zustand";
import { UR } from "./ur";
import "../styles/rtl.css";

export type Lang = "en" | "ur";
const STORAGE_KEY = "muzammil-pos-language";

function readSavedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "ur" ? "ur" : "en";
  } catch {
    return "en";
  }
}

/** Urdu reads right-to-left, so the whole page direction flips with the language. */
function applyToDocument(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ur" ? "rtl" : "ltr";
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: readSavedLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // The choice just isn't remembered.
    }
    applyToDocument(lang);
    set({ lang });
  },
}));

applyToDocument(useLangStore.getState().lang);

export type TranslateVars = Record<string, string | number>;

export function translate(lang: Lang, text: string, vars?: TranslateVars): string {
  let result = lang === "ur" ? (UR[text] ?? text) : text;
  if (vars) {
    for (const key of Object.keys(vars)) result = result.split(`{${key}}`).join(String(vars[key]));
  }
  return result;
}

/** Use inside components: const t = useT(); t("Save sale") */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return useCallback((text: string, vars?: TranslateVars) => translate(lang, text, vars), [lang]);
}

/** For code that is not a component (e.g. toasts). */
export function tr(text: string, vars?: TranslateVars): string {
  return translate(useLangStore.getState().lang, text, vars);
}