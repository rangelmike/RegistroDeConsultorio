import { createClient } from "./supabase/server";
import { getSupabaseConfig } from "./supabase/config";
import { createHash } from "node:crypto";

// Short negative cache for identical requests on this server. PostgreSQL is
// authoritative across instances, sessions and direct Data API requests.
const cooldowns = new Map<string, number>();
function limited(seconds: number) {
  return reply({message:`Cuota alcanzada. Intenta de nuevo en ${seconds} s.`},429,{"Retry-After":String(seconds)});
}

function reply(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}

async function readRequest(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new RangeError(); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function clinicalRequest(request: Request, rpc: "dental_operation" | "appointment_operation") {
  // Next can normalize the bind address to localhost. Compare against the
  // incoming HTTP authority so both supported loopback origins work.
  const expectedOrigin = new URL(request.url).protocol + "//" + request.headers.get("host");
  if (request.headers.get("origin") !== expectedOrigin ||
      !request.headers.get("content-type")?.startsWith("application/json")) return reply({}, 403);
  let body;
  try { body = await readRequest(request); }
  catch (error) { return reply({message:"Archivo o solicitud inválidos."},error instanceof RangeError ? 413 : 400); }
  const client = await createClient();
  // Forward only this session's access token. PostgREST verifies it and the RPC
  // checks the active Google session and clinic membership on every operation.
  const {data:{session}} = await client.auth.getSession();
  if (!session) return reply({message:"Vuelve a iniciar sesión."},401);
  const config = getSupabaseConfig();
  const encoded = JSON.stringify(body);
  const requestKey = createHash("sha256").update(rpc).update(session.access_token).update("\0").update(encoded).digest("hex");
  const remaining = Math.ceil(((cooldowns.get(requestKey) ?? 0) - Date.now()) / 1000);
  if (remaining > 0) return limited(remaining);
  cooldowns.delete(requestKey);
  try {
    const response = await fetch(config.url + "/rest/v1/rpc/" + rpc, {
      method:"POST", cache:"no-store", signal:AbortSignal.timeout(15000),
      headers: {apikey:config.key, Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
      body:encoded
    });
    if (response.ok) return reply(await response.json());
    if (response.status===429) {
      const seconds = Math.max(1, Number(response.headers.get("Retry-After")) || 10);
      if (cooldowns.size >= 1024) cooldowns.delete(cooldowns.keys().next().value!);
      cooldowns.set(requestKey, Date.now()+seconds*1000);
      return limited(seconds);
    }
    const error = await response.json();
    if ([401,403].includes(response.status)) return reply({message:"Acceso al consultorio denegado."},403);
    if (rpc === "appointment_operation") {
      if (response.status === 409) return reply({message:error.message === "Slot occupied"
        ? "Ese horario ya está ocupado. Elige otro turno."
        : "La cita o el expediente cambió. Vuelve a abrirlo antes de guardar."},409);
      return response.status >= 500 ? reply({message:"La agenda no está disponible."},503)
        : reply({message:"Revisa los datos de la cita y el horario seleccionado."},400);
    }
    const row = /^[1-9][0-9]?$/.test(error.details ?? "") ? `Expediente ${error.details}. ` : "";
    if (response.status===409) return reply({message:row+(error.message==="Duplicate differs" ?
      "Ya existe ese identificador con datos distintos. Revisa el archivo." :
      "El expediente o la selección cambió. Actualiza la consulta antes de continuar.")},409);
    if (response.status >= 500) return reply({message:"El servicio de expedientes no está disponible."},503);
    return reply({message:row+"Revisa los campos, identificadores y tamaño del expediente."},400);
  } catch { return reply({message:"No se pudo confirmar la operación. Revisa la consulta antes de reintentar."},503); }
}
