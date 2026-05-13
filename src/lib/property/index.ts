import { RentCastAdapter } from "./rentcast";
import { StubPropertyAdapter } from "./stub";
import type { PropertyAdapter } from "./types";

let cached: PropertyAdapter | null = null;

export function getPropertyAdapter(): PropertyAdapter {
  if (cached) return cached;
  const rc = new RentCastAdapter();
  if (rc.isConfigured) {
    console.info("[property] using RentCast adapter");
    cached = rc;
  } else {
    console.info("[property] RENTCAST_API_KEY not set — using stub adapter");
    cached = new StubPropertyAdapter();
  }
  return cached;
}

export type { PropertyAdapter } from "./types";
