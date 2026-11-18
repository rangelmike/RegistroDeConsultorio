import type { Bundle, RecordData } from "./dental-record";

export const batchSize = 50;
export const byteLimit = 2 * 1024 * 1024;
export async function readRecordFile(file: File): Promise<Bundle> {
  if (file.size > byteLimit) throw new Error("El archivo supera los 2 MiB.");
  let json;
  const bytes = await file.text();
  try { json = JSON.parse(bytes.replace(/^\uFEFF/, "")); } catch { throw new Error("El archivo no contiene JSON válido."); }
  const wrapped = json && typeof json === "object" && ("version" in json || "expedientes" in json);
  if (wrapped && (json.version !== 1 || !Array.isArray(json.expedientes))) throw new Error("Formato de intercambio no compatible.");
  const rows = wrapped ? json.expedientes : Array.isArray(json) ? json : [json];
  if (!rows.length || rows.length > batchSize) throw new Error("Elige un archivo con 1 a 50 expedientes.");
  // Stable IDs let the same file be retried after a lost response.
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bytes));
  const prefix = Array.from(new Uint8Array(hash).slice(0,12), b=>b.toString(16).padStart(2,"0")).join("");
  const expedientes = rows.map((row: RecordData, index: number) => {
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.nombre!=="string" ||
        !row.nombre.trim() || typeof row.telefono!=="string" || !row.telefono.trim()) {
      throw new Error(`Expediente ${index+1}. Se requieren nombre y teléfono como texto.`);
    }
    const id = `${prefix.slice(0,8)}-${prefix.slice(8,12)}-4${prefix.slice(13,16)}-a${prefix.slice(17,20)}-${prefix.slice(20)}${index.toString(16).padStart(8,"0")}`;
    return { ...row, id:row.id ?? id };
  });
  return {version:1, expedientes};
}
