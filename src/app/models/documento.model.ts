export interface Documento {
  //oficio
  id?: number;
  nombreDocumento: string;
  nro_registro: number;
  fechaIngreso: string;
  nroOficio: string;
  nombreOficio: string; // ✅ NUEVO
  procedencia: string;
  nombres: string;
  apellidos: string;
  delitoInfraccion: string;
  edad: number;
  dni: string;
  situacion: string;
  asunto: string;
  fechaIncidente: string; 
  horaIncidente: string;  

  //acta
  fechaActa: string;
  horaTomaMuestra: string;
  tipoMuestra: string;
  personaQueConduce: string;
  cualitativo: string;

  // ✅ NUEVO
  anexos?: {
    cadenaCustodia?: boolean;
    rotulo?: boolean;
    actaTomaMuestra?: boolean;
    actaConsentimiento?: boolean;
    actaDenunciaVerbal?: boolean;
    actaIntervencionPolicial?: boolean;
    copiaDniSidpol?: boolean;
    actaObtencionMuestra?: boolean;
  };
}