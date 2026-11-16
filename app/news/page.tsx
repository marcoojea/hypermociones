import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NewsCenter } from "@/components/news-center";
import injuriesJson from "@/data/generated/espn-segunda-injuries.json";
import newsJson from "@/data/generated/espn-segunda-news.json";
import type { SyncedInjuries, SyncedNews } from "@/data/espn-segunda-types";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Titulares de LaLiga Hypermotion 2026/27 y lesiones reportadas por ESPN, pendientes de confirmar.",
};

const news = newsJson as SyncedNews;
const injuries = injuriesJson as SyncedInjuries;

export default function NewsPage() {
  const articles = [...news.articles].sort((a, b) => b.published.localeCompare(a.published));
  return (
    <AppShell active="news">
      <NewsCenter
        articles={articles}
        newsFetchedAt={news.metadata.fetchedAt}
        injuries={injuries.injuries}
        injuriesFetchedAt={injuries.metadata.fetchedAt}
      />
    </AppShell>
  );
}
