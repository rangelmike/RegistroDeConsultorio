export type ClinicAction = "create" | "rename" | "add" | "remove" | "delete";
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function parseClinicInput(form: FormData) {
  const action = form.get("action") as ClinicAction;
  if (!["create", "rename", "add", "remove", "delete"].includes(action)) throw new Error("Operación inválida.");
  const id = form.get("clinicId"), access = form.get("accessId");
  if (action !== "create" && !validId(id)) throw new Error("Selecciona un consultorio válido.");
  if (action === "remove" && !validId(access)) throw new Error("Selecciona un integrante válido.");
  const rawName = form.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (["create", "rename"].includes(action) && (!name || [...name].length > 100)) throw new Error("El nombre debe tener entre 1 y 100 caracteres.");
  const rawEmails = form.get("emails");
  if (rawEmails !== null && typeof rawEmails !== "string") throw new Error("Escribe los correos de los integrantes.");
  if (rawEmails && rawEmails.length > 13000) throw new Error("Añade hasta 50 correos a la vez.");
  const emails = [...new Set((rawEmails || "").split(/[,;\n]+/).map(e => e.trim().toLowerCase()).filter(Boolean))];
  if (emails.length > 50 || emails.some(e => e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw new Error("Revisa los correos. Puedes añadir hasta 50, separados por coma o por línea.");
  if (action === "add" && !emails.length) throw new Error("Escribe al menos un correo.");
  if (action === "delete" && form.get("confirmation") !== "ELIMINAR") throw new Error("Escribe ELIMINAR para confirmar.");
  return { action, target_clinic: action === "create" ? null : id as string, clinic_name: name || null, member_emails: emails, target_access: action === "remove" ? access as string : null };
}
