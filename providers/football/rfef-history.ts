const decode = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code))).trim();
const number = (value: string | undefined) => {
  const parsed = Number(value?.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function parseRfefPlayerHistory(html: string) {
  const rows = [...html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap((body) => [...body[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]);
  const candidates = rows.map((row) => [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => decode(cell[1]))).filter((cells) => cells.length >= 8);
  const cells = candidates.find((candidate) => /divisi[oó]n|laliga|federaci[oó]n/i.test(candidate[0]) && !/copa|playoff/i.test(candidate[0])) ?? candidates[0];
  if (!cells) return null;
  const appearances = number(cells[1]);
  const substituteAppearances = Math.min(appearances, number(cells[2]));
  const minutes = number(cells[7]);
  if (appearances <= 0 || minutes <= 0) return null;
  return { competition: cells[0], appearances, substituteAppearances, starts: Math.max(0, appearances - substituteAppearances), goals: number(cells[3]), assists: number(cells[4]), yellowCards: number(cells[5]), redCards: number(cells[6]), minutes };
}
