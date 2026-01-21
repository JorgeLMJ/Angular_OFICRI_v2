export interface Auditoria {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  accion: string;
  tipoAccion: string; // CREATE, UPDATE, DELETE
  entidad: string;
  entidadId: number | null;
  detalles: string; // JSON como string
  sessionId: string | null;
  ip: string;
  userAgent: string;
  fecha: string; // ISO string
}