export const onboardingStorageKey = "hypermociones:onboarding:v1";
export const preferencesStorageKey = "hypermociones:preferences:v1";

export interface ProductPreferences {
  version: 1;
  onboardingCompleted: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  updatedAt: string;
}

export function defaultPreferences(): ProductPreferences {
  return { version: 1, onboardingCompleted: false, compactMode: false, reducedMotion: false, updatedAt: new Date(0).toISOString() };
}

export function isProductPreferences(value: unknown): value is ProductPreferences {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ProductPreferences>;
  return item.version === 1 && typeof item.onboardingCompleted === "boolean" && typeof item.compactMode === "boolean" && typeof item.reducedMotion === "boolean" && typeof item.updatedAt === "string";
}
