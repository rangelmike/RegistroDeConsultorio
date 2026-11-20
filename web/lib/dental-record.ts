export type Field = { key: string; label: string; type?: string; options?: string[] };
export type Installment = {fecha:string;cantidad:string};
export type PaymentMovement = {fecha?:string;tratamiento?:string;total?:string;anticipo?:string;resta?:string;firma?:string;abonos?:Installment[]};
export function paymentTotals(row:PaymentMovement) {
  const cost=Math.round(Number(row.total || 0)*100);
  const advance=Math.round(Number(row.anticipo || 0)*100);
  const installments=(row.abonos ?? []).reduce((sum,item)=>sum+Math.round(Number(item.cantidad || 0)*100),0);
  return {cost,advance,installments,balance:cost-advance-installments};
}
export type RecordData = {
  id: string;
  nombre: string;
  telefono: string;
  campos?: Record<string, string>;
  odontograma?: Record<string, Record<string, string>>;
  evolucion?: PaymentMovement[];
};
export type Summary = Pick<RecordData, "id" | "nombre" | "telefono"> & { revision: number };
export type Bundle = { version: 1; expedientes: RecordData[] };

export const groups: {title: string; fields: Field[]; defaultValue?: string}[] = [
  { title: "Identificación y contacto", fields: [
    { key: "edad", label: "Edad", type: "number" },
    { key: "fecha", label: "Fecha de la historia", type: "date" },
    { key: "direccion", label: "Dirección" },
    { key: "sexo", label: "Sexo", options: ["Femenino","Masculino","Otro"] },
    { key: "nacimiento", label: "Fecha de nacimiento", type: "date" },
    { key: "email", label: "Correo electrónico", type: "email" },
  ] },
  { title: "Signos vitales", fields: [
    { key: "tension", label: "Tensión arterial" },
    { key: "pulso", label: "Pulso" },
    { key: "frecuenciaRespiratoria", label: "Frecuencia respiratoria" },
  ] },
  { title: "Historia médica", fields: [
    { key: "motivo", label: "¿Cuál es el motivo de la consulta?", type: "textarea" },
    { key: "enfermedad", label: "¿Padece actualmente alguna enfermedad? ¿Cuál?" },
    { key: "tratamientoMedico", label: "¿Se encuentra actualmente bajo tratamiento médico? ¿Cuál?" },
    { key: "hospitalizacion", label: "¿Ha sido hospitalizado(a) en los últimos dos años? ¿Por qué?" },
    { key: "alergias", label: "¿Presenta alergias a medicamentos, drogas u otros elementos?" },
    { key: "hemorragia", label: "¿Ha tenido hemorragias que requieran atención especial?" },
    { key: "desmayos", label: "¿Ha sufrido algún desmayo o crisis convulsivas?" },
    { key: "embarazo", label: "¿Está embarazada?" },
    { key: "sustancias", label: "¿Consume tabaco, alcohol o algún tipo de estimulante?" },
    { key: "problemasDentales", label: "¿Ha presentado problemas graves relacionados con tratamientos dentales?" },
  ] },
  { title: "Antecedentes personales o familiares", defaultValue: "Sin antecedente", fields: [
    { key: "cardiacos", label: "Problemas cardiacos", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "tuberculosis", label: "Tuberculosis", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "anemia", label: "Anemia", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "ictericia", label: "Ictericia", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "asma", label: "Asma", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "presion", label: "Problemas de la presión", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "diabetes", label: "Diabetes", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "hepatitis", label: "Hepatitis", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "epilepsia", label: "Epilepsia", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "fiebreReumatica", label: "Fiebre reumática", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "traumatismo", label: "Traumatismo", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "sida", label: "SIDA", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "cirugias", label: "Intervenciones quirúrgicas", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "gastrointestinales", label: "Alteraciones gastrointestinales", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "transfusiones", label: "Transfusiones sanguíneas", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "artritis", label: "Artritis", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "renal", label: "Enfermedad renal", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "cancer", label: "Cáncer", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
    { key: "nervioso", label: "Alteraciones del sistema nervioso", options: ["Personal","Familiar","Personal y familiar","Sin antecedente"] },
  ] },
  { title: "Tejidos", defaultValue: "Normal", fields: [
    { key: "labios", label: "Labios", options: ["Normal","Atípico"] },
    { key: "lengua", label: "Lengua", options: ["Normal","Atípico"] },
    { key: "paladarDuro", label: "Paladar duro", options: ["Normal","Atípico"] },
    { key: "paladarBlando", label: "Paladar blando", options: ["Normal","Atípico"] },
    { key: "carrillos", label: "Carrillos", options: ["Normal","Atípico"] },
    { key: "pisoBoca", label: "Piso de la boca", options: ["Normal","Atípico"] },
    { key: "vestibulo", label: "Vestíbulo", options: ["Normal","Atípico"] },
    { key: "glandulas", label: "Glándulas salivales", options: ["Normal","Atípico"] },
  ] },
  { title: "Condiciones generales de la boca", fields: [
    { key: "caries", label: "Número de caries", type: "number" },
    { key: "cariesDolor", label: "Número de caries con dolor", type: "number" },
    { key: "ausentes", label: "Número de dientes ausentes", type: "number" },
    { key: "restauraciones", label: "Estado de las restauraciones" },
    { key: "higiene", label: "Estado general de la higiene" },
    { key: "periodonto", label: "Estado general del periodonto" },
    { key: "oclusion", label: "Estado general de la oclusión" },
  ] },
  { title: "Exploración periodontal", fields: [
    { key: "inflamacion", label: "Inflamación gingival", options: ["Sí","No"] },
    { key: "sarroSupra", label: "Sarro supragingival", options: ["Sí","No"] },
    { key: "sarroInfra", label: "Sarro infragingival", options: ["Sí","No"] },
    { key: "migracion", label: "Migración gingival", options: ["Sí","No"] },
    { key: "bolsas", label: "Bolsas periodontales", options: ["Sí","No"] },
    { key: "calidadHigiene", label: "Calificación de higiene", options: ["Buena","Regular","Mala"] },
  ] },
  { title: "Diagnóstico y seguimiento", fields: [
    { key: "radiografia", label: "Hallazgos radiográficos", type: "textarea" },
    { key: "diagnostico", label: "Diagnóstico", type: "textarea" },
    { key: "plan", label: "Plan de tratamiento", type: "textarea" },
    { key: "notas", label: "Notas de evolución", type: "textarea" },
    { key: "observaciones", label: "Observaciones", type: "textarea" },
  ] },
];
export const toothFields: Field[] = [
  {key:"hallazgo",label:"Hallazgo por pieza"},
  {key:"vestibular",label:"Vestibular"}, {key:"lingual",label:"Lingual o palatina"},
  {key:"mesial",label:"Mesial"}, {key:"distal",label:"Distal"}, {key:"oclusal",label:"Oclusal o incisal"},
  {key:"tratamiento",label:"Tratamiento presupuestado"}, {key:"presupuesto",label:"Presupuesto",type:"money"}
];
export const accountFields: Field[] = [
  {key:"fecha",label:"Fecha",type:"date"}, {key:"tratamiento",label:"Tratamiento"},
  {key:"total",label:"Costo total",type:"money"}, {key:"anticipo",label:"Anticipo",type:"money"},
  {key:"firma",label:"Firma (nombre escrito)"}
];
export function teeth(first: number, last: number) {
  return Array.from({ length: Math.abs(last-first)+1 }, (_,i) => String(first + Math.sign(last-first)*i));
}
export const arches = [
  {title:"Permanente", rows:[[...teeth(18,11),...teeth(21,28)],[...teeth(48,41),...teeth(31,38)]]},
  {title:"Infantil", rows:[[...teeth(55,51),...teeth(61,65)],[...teeth(85,81),...teeth(71,75)]]}
];
