// Property data provider interface — pulled at the address-entry step so the
// origination form can pre-fill valuation, comps, rent estimate, and tax info.
// The user can still override each field manually.

export interface PropertyLookupInput {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface PropertyLookupResult {
  /** AVM-style estimated value (RentCast "value" or equivalent). */
  estimatedValue: number | null;
  /** Confidence range high/low if the provider returns it. */
  valueRangeLow: number | null;
  valueRangeHigh: number | null;
  /** Comparable sales used to derive the value. */
  comps: Array<{
    address: string;
    salePrice: number;
    saleDate: string | null;
    distance: number | null;
  }>;
  /** Rent estimate per month if available. */
  rentEstimate: number | null;
  rentEstimateLow: number | null;
  rentEstimateHigh: number | null;
  /** Property characteristics. */
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  yearBuilt: number | null;
  /** Provider-native raw payload, for audit / debugging. */
  raw?: unknown;
}

export interface PropertyAdapter {
  readonly providerName: "rentcast" | "estated" | "stub";
  readonly isConfigured: boolean;
  lookup(input: PropertyLookupInput): Promise<PropertyLookupResult>;
}
