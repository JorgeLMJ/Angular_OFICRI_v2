import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OficioDosaje } from '../models/oficio-dosaje.model';

@Injectable({
  providedIn: 'root'
})
export class OficioDosajeService {
  private apiUrl = 'http://localhost:8080/api/oficio-dosaje';

  constructor(private http: HttpClient) {}

  crear(oficio: OficioDosaje): Observable<OficioDosaje> {
    return this.http.post<OficioDosaje>(this.apiUrl, oficio);
  }

  obtenerPorId(id: number): Observable<OficioDosaje> {
    return this.http.get<OficioDosaje>(`${this.apiUrl}/${id}`);
  }

  listar(): Observable<OficioDosaje[]> {
    return this.http.get<OficioDosaje[]>(this.apiUrl);
  }

  actualizar(id: number, oficio: OficioDosaje): Observable<OficioDosaje> {
    return this.http.put<OficioDosaje>(`${this.apiUrl}/${id}`, oficio);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}