"use client";

import { useEffect, useMemo, useState } from "react";
import { availabilityStorageKey, parseAvailabilityRecords, type AvailabilityRecord } from "@/domain/availability";

export const availabilityChangedEvent = "hypermociones:availability-changed";

function readRound(round: number) {
  return parseAvailabilityRecords(localStorage.getItem(availabilityStorageKey(round)), round);
}

export function useAvailability(round: number) {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setRecords(readRound(round));
      setLoaded(true);
    };
    const frame = window.requestAnimationFrame(refresh);
    window.addEventListener(availabilityChangedEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(availabilityChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [round]);

  const byPlayer = useMemo(() => new Map(records.map((record) => [record.playerId, record])), [records]);
  return { records, byPlayer, loaded };
}

export function saveAvailabilityRecords(round: number, records: AvailabilityRecord[]) {
  localStorage.setItem(availabilityStorageKey(round), JSON.stringify(records));
  window.dispatchEvent(new Event(availabilityChangedEvent));
}
