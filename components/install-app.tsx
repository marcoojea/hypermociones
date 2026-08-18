"use client";

import { useEffect, useState } from "react";

import { notifyProduct } from "@/domain/product-events";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const handle = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handle);
    return () => window.removeEventListener("beforeinstallprompt", handle);
  }, []);
  if (!prompt) return null;
  const install = async () => {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") notifyProduct("Hypermociones se ha añadido como aplicación.");
    setPrompt(null);
  };
  return <button className="shell-icon-button" onClick={() => void install()} type="button">Instalar</button>;
}
