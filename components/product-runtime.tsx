"use client";

import { useEffect } from "react";

import { defaultPreferences, isProductPreferences, preferencesStorageKey } from "@/domain/preferences";

export function ProductRuntime() {
  useEffect(() => {
    const applyPreferences = () => {
      let preferences = defaultPreferences();
      const raw = localStorage.getItem(preferencesStorageKey);
      if (raw) try { const parsed: unknown = JSON.parse(raw); if (isProductPreferences(parsed)) preferences = parsed; } catch { /* Use accessible defaults. */ }
      document.documentElement.classList.toggle("compact-mode", preferences.compactMode);
      document.documentElement.classList.toggle("reduce-motion", preferences.reducedMotion);
    };
    applyPreferences();
    window.addEventListener("storage", applyPreferences);
    window.addEventListener("hypermociones:preferences-changed", applyPreferences);
    window.addEventListener("hypermociones:data-restored", applyPreferences);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    return () => {
      window.removeEventListener("storage", applyPreferences);
      window.removeEventListener("hypermociones:preferences-changed", applyPreferences);
      window.removeEventListener("hypermociones:data-restored", applyPreferences);
    };
  }, []);
  return null;
}
