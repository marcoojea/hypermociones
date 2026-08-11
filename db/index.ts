// The runtime repository is intentionally injected at the application boundary.
// This module exposes the PostgreSQL schema without opening a connection at import time.
export * from "./schema";
