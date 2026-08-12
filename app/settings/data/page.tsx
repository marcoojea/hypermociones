import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LocalDataManager } from "@/components/local-data-manager";

export const metadata: Metadata = { title: "Datos locales", description: "Exporta, restaura o elimina los datos locales de Hypermociones." };

export default function LocalDataPage() {
  return <AppShell active="settings"><LocalDataManager /></AppShell>;
}
