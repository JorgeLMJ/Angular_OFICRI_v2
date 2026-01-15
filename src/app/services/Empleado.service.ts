import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmpleadoDTO } from '../models/empleado.model';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private readonly baseUrl = 'http://localhost:8080/api/empleados';

  constructor(private http: HttpClient) {}

  getAll(): Observable<EmpleadoDTO[]> {
    return this.http.get<EmpleadoDTO[]>(this.baseUrl);
  }

  getById(id: number): Observable<EmpleadoDTO> {
    return this.http.get<EmpleadoDTO>(`${this.baseUrl}/${id}`);
  }

  create(payload: EmpleadoDTO): Observable<EmpleadoDTO> {
    return this.http.post<EmpleadoDTO>(this.baseUrl, payload);
  }

  update(id: number, payload: EmpleadoDTO): Observable<EmpleadoDTO> {
    return this.http.put<EmpleadoDTO>(`${this.baseUrl}/${id}`, payload);
  }

  updateEstado(id: number, estado: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/estado`, { estado });
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}
