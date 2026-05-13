import type {
  PropertyAdapter,
  PropertyLookupInput,
  PropertyLookupResult,
} from "./types";

/**
 * RentCast adapter (https://www.rentcast.io/api).
 *
 * Required env:
 *   - RENTCAST_API_KEY
 *
 * Endpoints used:
 *   - GET /v1/avm/value?address=...  AVM-based estimated value + comps
 *   - GET /v1/avm/rent?address=...   Rent estimate
 *
 * Both fail gracefully — partial data is better than no data, so we
 * Promise.allSettled the calls and merge what came back.
 */
export class RentCastAdapter implements PropertyAdapter {
  readonly providerName = "rentcast" as const;
  readonly isConfigured: boolean;

  constructor(
    private readonly env = {
      apiKey: process.env.RENTCAST_API_KEY,
    }
  ) {
    this.isConfigured = Boolean(env.apiKey);
  }

  async lookup(input: PropertyLookupInput): Promise<PropertyLookupResult> {
    if (!this.isConfigured) throw new Error("RentCast not configured");

    const address = `${input.street}, ${input.city}, ${input.state} ${input.zip}`;
    const headers = {
      "X-Api-Key": this.env.apiKey!,
      Accept: "application/json",
    };

    const [valueRes, rentRes] = await Promise.allSettled([
      fetch(
        `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(address)}&compCount=5`,
        { headers }
      ),
      fetch(
        `https://api.rentcast.io/v1/avm/rent?address=${encodeURIComponent(address)}&compCount=5`,
        { headers }
      ),
    ]);

    const value = await unpack(valueRes);
    const rent = await unpack(rentRes);

    return {
      estimatedValue: numOrNull(value?.price),
      valueRangeLow: numOrNull(value?.priceRangeLow),
      valueRangeHigh: numOrNull(value?.priceRangeHigh),
      comps: ((value?.comparables as Array<Record<string, unknown>>) || []).map(
        (c) => ({
          address: String(c.formattedAddress || c.addressLine1 || ""),
          salePrice: numOrNull(c.price ?? c.lastSalePrice) ?? 0,
          saleDate: c.lastSaleDate ? String(c.lastSaleDate) : null,
          distance: numOrNull(c.distance),
        })
      ),
      rentEstimate: numOrNull(rent?.rent),
      rentEstimateLow: numOrNull(rent?.rentRangeLow),
      rentEstimateHigh: numOrNull(rent?.rentRangeHigh),
      bedrooms: numOrNull(value?.bedrooms),
      bathrooms: numOrNull(value?.bathrooms),
      squareFootage: numOrNull(value?.squareFootage),
      yearBuilt: numOrNull(value?.yearBuilt),
      raw: { value, rent },
    };
  }
}

function numOrNull(input: unknown): number | null {
  if (input == null) return null;
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
}

async function unpack(
  result: PromiseSettledResult<Response>
): Promise<Record<string, unknown> | null> {
  if (result.status !== "fulfilled") return null;
  if (!result.value.ok) {
    console.warn("[rentcast] non-ok response", result.value.status);
    return null;
  }
  try {
    return (await result.value.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
