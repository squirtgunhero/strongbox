export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatRate(rate: number | null | undefined): string {
  if (rate == null) return "--";
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function borrowerDisplayName(borrower: {
  borrower_type: string;
  first_name: string | null;
  last_name: string | null;
  entity_name: string | null;
}): string {
  if (borrower.borrower_type === "entity" && borrower.entity_name) {
    return borrower.entity_name;
  }
  return [borrower.first_name, borrower.last_name].filter(Boolean).join(" ") || "Unknown";
}

export function propertyAddress(property: {
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}): string {
  return `${property.address_street}, ${property.address_city}, ${property.address_state} ${property.address_zip}`;
}
