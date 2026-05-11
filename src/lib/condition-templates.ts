// Predefined sets of standard closing conditions. Admin can apply with one click
// from the loan detail conditions checklist.

export interface ConditionTemplate {
  id: string;
  name: string;
  conditions: string[];
}

export const CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    id: "purchase_standard",
    name: "Purchase — Standard",
    conditions: [
      "Clear title commitment with no material exceptions",
      "Hazard insurance with lender as mortgagee/loss payee",
      "Executed purchase contract",
      "Wire instructions verified with closing agent",
      "Borrower entity good standing certificate (if entity)",
      "Personal guarantee executed",
      "Government-issued ID for all signers",
    ],
  },
  {
    id: "rehab_loan",
    name: "Rehab Loan",
    conditions: [
      "Clear title commitment with no material exceptions",
      "Hazard insurance — builder's risk policy",
      "Detailed rehab budget reviewed and approved",
      "Contractor agreement on file",
      "Scope of work signed by borrower and contractor",
      "Permits for material work (if required by jurisdiction)",
      "Initial draw schedule agreed",
      "Personal guarantee executed",
    ],
  },
  {
    id: "refinance",
    name: "Refinance",
    conditions: [
      "Existing payoff letter from current lender",
      "Clear title commitment with no material exceptions",
      "Hazard insurance with lender as mortgagee",
      "Most recent property tax statement",
      "HOA estoppel certificate (if applicable)",
      "Personal guarantee executed",
    ],
  },
  {
    id: "ground_up",
    name: "Ground-Up Construction",
    conditions: [
      "Clear title commitment with no material exceptions",
      "Builder's risk insurance policy",
      "Detailed construction budget reviewed and approved",
      "GC license and insurance verified",
      "Plans and specs on file",
      "Building permit issued",
      "Initial draw schedule agreed",
      "Survey on file",
      "Soil report (if required)",
      "Personal guarantee executed",
    ],
  },
];
