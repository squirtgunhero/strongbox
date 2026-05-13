import type {
  PropertyAdapter,
  PropertyLookupInput,
  PropertyLookupResult,
} from "./types";

export class StubPropertyAdapter implements PropertyAdapter {
  readonly providerName = "stub" as const;
  readonly isConfigured = false;
  async lookup(_input: PropertyLookupInput): Promise<PropertyLookupResult> {
    return {
      estimatedValue: null,
      valueRangeLow: null,
      valueRangeHigh: null,
      comps: [],
      rentEstimate: null,
      rentEstimateLow: null,
      rentEstimateHigh: null,
      bedrooms: null,
      bathrooms: null,
      squareFootage: null,
      yearBuilt: null,
    };
  }
}
