"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";

export async function updateProperty(propertyId: string, formData: FormData) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const numOrNull = (key: string): number | null => {
    const v = formData.get(key) as string;
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };
  const intOrNull = (key: string): number | null => {
    const v = formData.get(key) as string;
    if (!v) return null;
    const n = parseInt(v);
    return isNaN(n) ? null : n;
  };
  const strOrNull = (key: string): string | null => {
    const v = (formData.get(key) as string)?.trim();
    return v || null;
  };

  const update = {
    address_street: formData.get("address_street") as string,
    address_city: formData.get("address_city") as string,
    address_state: (formData.get("address_state") as string).toUpperCase(),
    address_zip: formData.get("address_zip") as string,
    property_type: formData.get("property_type") as string,
    purchase_price: numOrNull("purchase_price"),
    as_is_value: numOrNull("as_is_value"),
    after_repair_value: numOrNull("after_repair_value"),
    rehab_budget: numOrNull("rehab_budget"),
    square_footage: intOrNull("square_footage"),
    parcel_number: strOrNull("parcel_number"),
    county: strOrNull("county"),
  };

  const { error } = await supabase
    .from("properties")
    .update(update)
    .eq("id", propertyId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "properties",
    record_id: propertyId,
    action: "update",
    new_values: update,
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/properties");
}
