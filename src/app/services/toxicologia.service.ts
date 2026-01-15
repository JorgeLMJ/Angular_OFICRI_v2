import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AsignacionToxicologia} from '../models/toxicologia.model';

@Injectable({
  providedIn: 'root'
})
export class AsignacionToxicologiaService {
  private apiUrl = 'http://localhost:8080/api/asignaciones-toxicologia'; // URL del nuevo endpoint

  constructor(private http: HttpClient) { }

  crear(data: AsignacionToxicologia): Observable<AsignacionToxicologia> {
    return this.http.post<AsignacionToxicologia>(this.apiUrl, data);
  }

  obtenerPorId(id: number): Observable<AsignacionToxicologia> {
    return this.http.get<AsignacionToxicologia>(`${this.apiUrl}/${id}`);
  }

  listar(): Observable<AsignacionToxicologia[]> {
    return this.http.get<AsignacionToxicologia[]>(this.apiUrl);
  }

  actualizar(id: number, data: AsignacionToxicologia): Observable<AsignacionToxicologia> {
    return this.http.put<AsignacionToxicologia>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
