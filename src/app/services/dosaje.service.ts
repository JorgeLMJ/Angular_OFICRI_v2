import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AsignacionDosaje } from '../models/dosaje.model';

@Injectable({
  providedIn: 'root'
})
export class DosajeService {
  private apiUrl = 'http://localhost:8080/api/asignaciones-dosaje'; // Usa el endpoint existente de asignaciones

  constructor(private http: HttpClient) {}

  crear(asignacion: AsignacionDosaje): Observable<AsignacionDosaje> {
    return this.http.post<AsignacionDosaje>(this.apiUrl, asignacion);
  }

  obtenerPorId(id: number): Observable<AsignacionDosaje> {
    return this.http.get<AsignacionDosaje>(`${this.apiUrl}/${id}`);
  }

  listar(): Observable<AsignacionDosaje[]> {
    return this.http.get<AsignacionDosaje[]>(this.apiUrl);
  }

  actualizar(id: number, asignacion: AsignacionDosaje): Observable<AsignacionDosaje> {
    return this.http.put<AsignacionDosaje>(`${this.apiUrl}/${id}`, asignacion);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ✅ Método para filtrar solo asignaciones de "Dosaje"
  listarDosaje(): Observable<AsignacionDosaje[]> {
    return this.http.get<AsignacionDosaje[]>(this.apiUrl).pipe(
      // Si tu backend no filtra por área, puedes hacerlo en el frontend:
      // Pero es mejor que el backend tenga /api/asignaciones?area=Dosaje
    );
  }
}