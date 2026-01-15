// src/app/models/notification.model.ts
export interface Notification {
  id: number;
  message: string;
  area: string;
  asignacionId: number;
  timestamp: string; // ISO string desde backend
  read: boolean;
  empleado: {
    id: number;
    nombre: string;
    apellido: string;
  };
  emisor: {
    id: number;
    nombre: string;
    apellido: string;
    cargo: string;
  };
}