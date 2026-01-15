export interface NotificationCreateDTO {
  message: string;
  area: string;
  asignacionId: number;
  destinatarioId: number; 
  emisorId: number;
}