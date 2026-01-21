import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auditoria } from '../models/auditoria.model';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private apiUrl = 'http://localhost:8080/api/auditoria';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(this.apiUrl);
  }

  getByTipo(tipoAccion: string): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(`${this.apiUrl}/tipo/${tipoAccion}`);
  }

  getByRango(fechaInicio: string, fechaFin: string): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(
      `${this.apiUrl}/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
    );
  }
}