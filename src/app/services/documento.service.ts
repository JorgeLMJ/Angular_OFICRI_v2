// documentacion/documento.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Documento } from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private apiUrl = 'http://localhost:8080/api/documentos'; // Ajusta la URL según tu backend

  constructor(private http: HttpClient) { }

  getDocumentos(): Observable<Documento[]> {
    return this.http.get<Documento[]>(this.apiUrl);
  }

  getDocumentoById(id: number): Observable<Documento> {
    return this.http.get<Documento>(`${this.apiUrl}/${id}`);
  }

  createDocumento(documento: Documento): Observable<Documento> {
    return this.http.post<Documento>(this.apiUrl, documento);
  }

  updateDocumento(id: number, documento: Documento): Observable<Documento> {
    return this.http.put<Documento>(`${this.apiUrl}/${id}`, documento);
  }

  deleteDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}