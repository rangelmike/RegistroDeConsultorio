"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { requireSession } from "../../lib/session";
import { parseClinicInput, validId } from "../../lib/clinic-input";
export type ActionState = { error?: string; success?: string; version?: number };
export async function claimInvitations() {
  const { supabase } = await requireSession();
  const { error } = await supabase.rpc("claim_clinic_invitations");
  revalidatePath("/panel", "layout");
  redirect(error ? "/panel/consultorios?setup=error" : "/panel/consultorios");
}
export async function changeClinic(form: FormData) {
  const { supabase } = await requireSession();
  const id = form.get("clinicId");
  if (!validId(id)) return;
  const { data, error } = await supabase.from("clinics").select("id").eq("id", id).maybeSingle();
  if (error || !data) { revalidatePath("/panel", "layout"); return; }
  (await cookies()).set("active-clinic", id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 2592000 });
  revalidatePath("/panel", "layout");
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/panel/consultorios?logout=error");
  (await cookies()).delete("active-clinic");
  redirect("/");
}
export async function manageClinic(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireSession();
  let input: ReturnType<typeof parseClinicInput>;
  try { input = parseClinicInput(form); } catch (error) { return { error: (error as Error).message }; }
  const { data: id, error } = await supabase.rpc("manage_clinic", input);
  if (error) return { error: error.code === "42501" ? "Ya no tienes permiso para realizar este cambio. Actualiza la página." : "No se pudo guardar. Revisa los datos y los límites de integrantes e inténtalo de nuevo." };
  if (input.action === "create" && validId(id)) (await cookies()).set("active-clinic", id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 2592000 });
  if (input.action === "delete" && (await cookies()).get("active-clinic")?.value === input.target_clinic) (await cookies()).delete("active-clinic");
  revalidatePath("/panel", "layout");
  return { success: input.action === "delete" ? "Consultorio eliminado." : "Cambios guardados.", version: Date.now() };
}
