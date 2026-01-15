export interface AsignacionDosaje {
  id?: number;
  area: string; // Ej: "Dosaje"
  cualitativo?: string;
  cuantitativo?: string; // o number, según tu backend
  estado: string;
  documentoId: number;
  empleadoId:number;
}