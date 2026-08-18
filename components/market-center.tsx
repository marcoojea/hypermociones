"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { emptyMarket, isMarketState, marketStorageKey, type MarketState } from "@/domain/market";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import { notifyProduct } from "@/domain/product-events";
import { PlayerPicker } from "./player-picker";
import { useRecommendations } from "./use-recommendations";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function MarketCenter({ players, teams, round }: { players: PlayerListItem[]; teams: TeamSummary[]; round: number }) {
  const [market, setMarket] = useState<MarketState>(emptyMarket());
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [change1d, setChange1d] = useState("");
  const [message, setMessage] = useState("Sin datos importados.");
  const [fieldError, setFieldError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const { byPlayer: recommendations } = useRecommendations(players, teams, round);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = localStorage.getItem(marketStorageKey);
      if (raw) try {
        const parsed: unknown = JSON.parse(raw);
        if (isMarketState(parsed)) { setMarket(parsed); setMessage(`${parsed.entries.length} precios locales.`); }
      } catch { setMessage("Los datos locales de mercado no son válidos. Puedes importar una copia compatible."); }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const save = (next: MarketState) => {
    const stored = { ...next, updatedAt: new Date().toISOString() };
    setMarket(stored);
    localStorage.setItem(marketStorageKey, JSON.stringify(stored));
    setMessage(`${stored.entries.length} precios guardados en este navegador.`);
  };

  const add = () => {
    const numeric = Number(value);
    const dailyChange = change1d.trim() === "" ? null : Number(change1d);
    if (!playerId) { setFieldError("Selecciona un jugador."); return; }
    if (value.trim() === "" || !Number.isFinite(numeric) || numeric < 0) { setFieldError("Introduce un valor igual o superior a cero."); return; }
    if (dailyChange !== null && !Number.isFinite(dailyChange)) { setFieldError("La variación diaria debe ser un número."); return; }
    setFieldError("");
    const entry = { playerId, value: numeric, change1d: dailyChange, change7d: null, updatedAt: new Date().toISOString() };
    save({ ...market, entries: [...market.entries.filter((item) => item.playerId !== playerId), entry] });
    setValue(""); setChange1d("");
    notifyProduct("Precio guardado en este dispositivo.");
  };

  const exportMarket = () => {
    const blob = new Blob([JSON.stringify(market, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "hypermociones-mercado.json"; anchor.click(); URL.revokeObjectURL(url);
    notifyProduct("Mercado exportado.");
  };

  const importMarket = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { setMessage("El archivo supera el límite de 2 MB."); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isMarketState(parsed)) throw new Error("Archivo de mercado no válido o incompatible.");
      save(parsed); notifyProduct("Mercado importado correctamente.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo importar."); }
  };

  const playerById = new Map(players.map((player) => [player.id, player]));
  const rows = market.entries.flatMap((entry) => {
    const player = playerById.get(entry.playerId);
    return player ? [{ entry, player, recommendation: recommendations.get(player.id) }] : [];
  }).sort((a, b) => (b.entry.change1d ?? -Infinity) - (a.entry.change1d ?? -Infinity));

  return <>
    <section className="page-header"><div><p className="eyebrow">Mercado aportado · Sin scraping</p><h1>Mercado Fantasy</h1><p>Registra o importa precios reales y analiza variación, Tier y rentabilidad sin inventar valores.</p></div><div className="header-stat"><strong>{rows.length}</strong><span>precios</span></div></section>
    <section className="market-input">
      <PlayerPicker label="Jugador" onChange={setPlayerId} options={players.map((player) => ({ value: player.id, label: `${player.name} · ${player.team.shortName}`, keywords: `${player.position} ${player.team.name}` }))} value={playerId} />
      <label><span>Valor €</span><input aria-describedby={fieldError ? "market-error" : undefined} inputMode="decimal" onChange={(event) => setValue(event.target.value)} placeholder="1000000" value={value} /></label>
      <label><span>Variación 24h €</span><input inputMode="decimal" onChange={(event) => setChange1d(event.target.value)} placeholder="25000" value={change1d} /></label>
      <button className="button button-primary" disabled={!loaded} onClick={add} title={!loaded ? "Espera a que termine de cargar el mercado" : undefined} type="button">Guardar precio</button>
      <button className="button" onClick={() => importRef.current?.click()} type="button">Importar JSON</button>
      <button className="button" disabled={!rows.length} onClick={exportMarket} title={!rows.length ? "Añade al menos un precio antes de exportar" : undefined} type="button">Exportar</button>
      <input ref={importRef} hidden accept="application/json" type="file" onChange={(event) => void importMarket(event.target.files?.[0])} />
    </section>
    {fieldError && <p className="field-error" id="market-error" role="alert">{fieldError}</p>}
    <p className="market-message" role="status">{message}</p>
    {rows.length ? <div className="table-shell market-table"><table><thead><tr><th>Jugador</th><th>Valor</th><th>24 horas</th><th>Tier</th><th>Prob. jugar</th><th>Rentabilidad</th><th /></tr></thead><tbody>{rows.map(({ entry, player, recommendation }) => <tr key={player.id}><td><Link className="player-cell" href={`/player/${player.slug}`}><span className="team-token" style={{ background: player.team.primaryColor }}>{player.shirtNumber ?? "—"}</span><span><strong>{player.name}</strong><small>{player.position} · {player.team.shortName}</small></span></Link></td><td className="numeric strong">{money.format(entry.value)}</td><td className={`numeric market-change ${(entry.change1d ?? 0) >= 0 ? "up" : "down"}`}>{entry.change1d === null ? "—" : `${entry.change1d >= 0 ? "+" : ""}${money.format(entry.change1d)}`}</td><td><span className={`tier-badge tier-${recommendation?.tier.replace("+", "plus").toLowerCase()}`}>{recommendation?.tier ?? "NR"}</span></td><td className="numeric">{recommendation?.startingProbability === null ? "—" : `${recommendation?.startingProbability}%`}</td><td className="numeric">{player.fantasyPoints === null || entry.value <= 0 ? "—" : `${(player.fantasyPoints / (entry.value / 1_000_000)).toFixed(2)} pt/M`}</td><td><button aria-label={`Eliminar precio de ${player.name}`} onClick={() => { save({ ...market, entries: market.entries.filter((item) => item.playerId !== player.id) }); notifyProduct("Precio eliminado.", "info"); }} type="button">×</button></td></tr>)}</tbody></table></div> : <section className="empty-tool"><strong>Añade tu primera referencia de mercado</strong><p>Los valores deben proceder de tu plataforma Fantasy o de una exportación permitida.</p></section>}
    <p className="analytics-disclaimer"><strong>Origen:</strong> estos precios son aportados por el usuario y permanecen en este navegador. Hypermociones no afirma que sean valores oficiales ni los actualiza automáticamente.</p>
  </>;
}
