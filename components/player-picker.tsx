"use client";

import { useMemo, useState } from "react";

export interface PlayerPickerOption {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
}

export function PlayerPicker({ label, value, options, onChange, emptyLabel = "Sin seleccionar", className = "" }: { label: string; value: string; options: PlayerPickerOption[]; onChange(value: string): void; emptyLabel?: string; className?: string }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const matches = normalized ? options.filter((option) => `${option.label} ${option.keywords ?? ""}`.toLocaleLowerCase("es").includes(normalized)) : options;
    const selected = options.find((option) => option.value === value);
    const limited = matches.slice(0, 80);
    return selected && !limited.some((option) => option.value === selected.value) ? [selected, ...limited] : limited;
  }, [options, query, value]);
  return <div className={`player-picker ${className}`.trim()}>
    <label><span>{label}</span><input aria-label={`Buscar ${label}`} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe nombre o equipo…" value={query} /></label>
    <select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}><option value="">{emptyLabel}</option>{visible.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}</select>
    <small>{query ? `${visible.length} coincidencias mostradas` : `${Math.min(options.length, 80)} de ${options.length}; escribe para filtrar`}</small>
  </div>;
}
