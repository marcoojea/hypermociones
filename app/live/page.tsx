import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { LiveCenter } from "@/components/live-center";

export const metadata: Metadata = { title: "Centro live", description: "Marcadores, eventos y estadísticas en directo de LALIGA HYPERMOTION." };
export const dynamic = "force-dynamic";

export default function LivePage() {
  return <AppShell active="live"><LiveCenter /></AppShell>;
}
