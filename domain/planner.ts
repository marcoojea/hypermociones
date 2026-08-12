export const plannerStorageKey = "hypermociones:planner:v1";
export interface TransferScenario { id: string; name: string; outPlayerId: string | null; inPlayerId: string | null; createdAt: string; }
export interface PlannerState { version: 1; horizon: number; scenarios: TransferScenario[]; updatedAt: string; }
export function emptyPlanner(): PlannerState { return { version: 1, horizon: 5, scenarios: [], updatedAt: new Date(0).toISOString() }; }
export function isPlannerState(value: unknown): value is PlannerState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PlannerState>;
  return state.version === 1 && Number.isInteger(state.horizon) && (state.horizon ?? 0) >= 1 && (state.horizon ?? 0) <= 5 && typeof state.updatedAt === "string" && Array.isArray(state.scenarios) && state.scenarios.length <= 5
    && state.scenarios.every((item) => item && typeof item.id === "string" && typeof item.name === "string" && item.name.length <= 60 && (item.outPlayerId === null || typeof item.outPlayerId === "string") && (item.inPlayerId === null || typeof item.inPlayerId === "string") && typeof item.createdAt === "string");
}
