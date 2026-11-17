import { cache } from "react";
import { cookies } from "next/headers";
import { requireSession } from "./session";
export type Clinic = { id: string; name: string; owner_id: string; created_at: string };
export type Access = { id: string; email: string; user_id: string | null; clinic_id: string };
export const getClinics = cache(async () => {
  const { supabase, user } = await requireSession();
  const clinics: Clinic[] = [];
  for (let start = 0; ; start += 100) {
    const { data, error } = await supabase.from("clinics").select("id,name,owner_id,created_at").order("id").range(start, start + 99);
    if (error) return { clinics: [], active: null, user, unavailable: true };
    clinics.push(...data as Clinic[]);
    if (data.length < 100) break;
  }
  clinics.sort((a, b) => a.name.localeCompare(b.name, "es"));
  const selected = (await cookies()).get("active-clinic")?.value;
  return { clinics, active: clinics.find(c => c.id === selected) ?? clinics[0] ?? null, user, unavailable: false };
});
