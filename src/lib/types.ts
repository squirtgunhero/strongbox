export type LoanStatus =
  | "lead"
  | "application"
  | "underwriting"
  | "approved"
  | "funded"
  | "active"
  | "paid_off"
  | "defaulted"
  | "foreclosure";

export type PropertyType =
  | "single_family"
  | "multi_family"
  | "commercial"
  | "land"
  | "mixed_use";

export type LoanPurpose = "purchase" | "refinance" | "rehab" | "ground_up";
export type ExitStrategy = "sale" | "refinance" | "rental";
export type BorrowerType = "individual" | "entity";
export type PaymentType =
  | "interest"
  | "principal"
  | "late_fee"
  | "default_interest"
  | "payoff"
  | "escrow";
export type DayCountConvention = "actual_360" | "actual_365";
export type UserRole = "admin" | "loan_officer" | "borrower" | "investor";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  property_type: PropertyType;
  purchase_price: number | null;
  as_is_value: number | null;
  after_repair_value: number | null;
  rehab_budget: number | null;
  square_footage: number | null;
  parcel_number: string | null;
  county: string | null;
  created_at: string;
  updated_at: string;
}

export interface Borrower {
  id: string;
  user_id: string | null;
  borrower_type: BorrowerType;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  ssn_encrypted: string | null;
  credit_score: number | null;
  entity_name: string | null;
  ein_encrypted: string | null;
  formation_state: string | null;
  deals_completed: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  property_id: string | null;
  status: LoanStatus;
  loan_purpose: LoanPurpose | null;
  exit_strategy: ExitStrategy | null;
  loan_amount: number;
  interest_rate: number;
  default_rate: number | null;
  points: number | null;
  day_count: DayCountConvention;
  term_months: number;
  current_principal: number;
  origination_date: string | null;
  funded_date: string | null;
  maturity_date: string | null;
  default_date: string | null;
  is_defaulted: boolean;
  extension_count: number;
  max_extensions: number | null;
  extension_fee_points: number | null;
  loan_officer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanWithRelations extends Loan {
  property: Property | null;
  loan_borrowers: {
    borrower: Borrower;
    is_primary: boolean;
  }[];
  loan_officer: Profile | null;
}

export interface Payment {
  id: string;
  loan_id: string;
  payment_type: PaymentType;
  amount: number;
  applied_to_late_fees: number;
  applied_to_default_interest: number;
  applied_to_interest: number;
  applied_to_escrow: number;
  applied_to_principal: number;
  due_date: string;
  received_date: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  lead: "Lead",
  application: "Application",
  underwriting: "Underwriting",
  approved: "Approved",
  funded: "Funded",
  active: "Active",
  paid_off: "Paid Off",
  defaulted: "Defaulted",
  foreclosure: "Foreclosure",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: "Single Family",
  multi_family: "Multi-Family",
  commercial: "Commercial",
  land: "Land",
  mixed_use: "Mixed Use",
};

export const LOAN_PURPOSE_LABELS: Record<LoanPurpose, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
  rehab: "Rehab",
  ground_up: "Ground-Up Construction",
};

export const EXIT_STRATEGY_LABELS: Record<ExitStrategy, string> = {
  sale: "Sale",
  refinance: "Refinance",
  rental: "Rental",
};
