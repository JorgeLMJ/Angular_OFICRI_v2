// src/app/services/reporte.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GraficoSustancia,
  GraficoEstado,
  GraficoEmpleado,
  GraficoRangoCualitativo,
  DocumentoPorDia,
  Metrica
} from '../models/reportes.model';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private baseUrl = 'http://localhost:8080/api/reportes';

  constructor(private http: HttpClient) {}

  getMetricas(): Observable<Metrica> {
    return this.http.get<Metrica>(`${this.baseUrl}/metricas`);
  }

  getAnalisisPorSustancia(): Observable<GraficoSustancia[]> {
    return this.http.get<GraficoSustancia[]>(`${this.baseUrl}/analisis/sustancia`);
  }

  getEstados(): Observable<GraficoEstado[]> {
    return this.http.get<GraficoEstado[]>(`${this.baseUrl}/estados`);
  }

  getDocumentosPorDia(): Observable<DocumentoPorDia[]> {
    return this.http.get<DocumentoPorDia[]>(`${this.baseUrl}/documentos/dia`);
  }

  getEmpleados(): Observable<GraficoEmpleado[]> {
    return this.http.get<GraficoEmpleado[]>(`${this.baseUrl}/empleados/productividad`);
  }

  descargarExcel(mes: number, anio: number): void {
    const url = `${this.baseUrl}/excel?mes=${mes}&anio=${anio}`;
    window.open(url, '_blank');
  }

  descargarPdf(mes: number, anio: number): void {
    const url = `${this.baseUrl}/pdf?mes=${mes}&anio=${anio}`;
    window.open(url, '_blank');
  }
  getRangosCualitativos(): Observable<GraficoRangoCualitativo[]> {
  return this.http.get<GraficoRangoCualitativo[]>(`${this.baseUrl}/rangos/cualitativo`);
}
}