// 👇 REGISTRO OBLIGATORIO DE CHART.JS
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

// ✅ Importaciones corregidas: interfaces desde el modelo
import { ReporteService } from '../../../services/reporte.service';
import {
  GraficoSustancia,
  GraficoRangoCualitativo,
  GraficoEmpleado,
  DocumentoPorDia
} from '../../../models/reportes.model';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective
  ],
  templateUrl: './reportes.component.html'
})
export class ReportesComponent implements OnInit {

  // 📊 Métricas adicionales
  public totalEmpleados: number = 0;
  public totalDocumentos: number = 0;
  public documentosPorDia: DocumentoPorDia[] = [];

  // 📊 Configuraciones de gráficos
  public barChartConfig: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Análisis por sustancia',
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: { responsive: true }
  };

  // ✅ NUEVO: Configuración del gráfico de rangos
  public rangoChartConfig: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Cantidad de asignaciones',
        data: [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)', // Azul: Bajo
          'rgba(255, 206, 86, 0.6)', // Amarillo: Medio
          'rgba(255, 99, 132, 0.6)'  // Rojo: Alto
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: { title: { display: true, text: 'Rango de Resultado' } },
        y: { 
          title: { display: true, text: 'Cantidad' },
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            callback: function(value: any) {
              return Number.isInteger(value) ? value : null;
            }
          }
        }
      }
    }
  };

  public lineChartConfig: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Documentos por día',
        data: [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: { responsive: true }
  };

  public horizontalBarChartConfig: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Análisis por empleado',
        data: [],
        backgroundColor: [
          'rgba(255, 159, 64, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 205, 86, 0.2)'
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 205, 86, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y'
    }
  };

  constructor(private reporteService: ReporteService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos() {
    // 📊 Métricas resumen
    this.reporteService.getMetricas().subscribe({
      next: (metricas) => {
        this.totalEmpleados = metricas.totalEmpleados;
        this.totalDocumentos = metricas.totalDocumentos;
      },
      error: (err: any) => console.error('Error cargando métricas:', err)
    });

    // 📊 Análisis por sustancia
    this.reporteService.getAnalisisPorSustancia().subscribe({
      next: (data: GraficoSustancia[]) => {
        this.barChartConfig.data.labels = data.map(d => d.sustancia);
        this.barChartConfig.data.datasets[0].data = data.map(d => d.totalAnalisis);
        this.barChartConfig.options = {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: { title: { display: true, text: 'Sustancia' } },
            y: { 
              title: { display: true, text: 'Cantidad' },
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: function(value: any) {
                  if (Number.isInteger(value)) {
                    return value;
                  }
                }
              }
            }
          }
        };
      },
      error: (err: any) => console.error('Error cargando sustancias:', err)
    });

    // ✅ NUEVO: Cargar rangos cualitativos
    this.reporteService.getRangosCualitativos().subscribe({
      next: (data: GraficoRangoCualitativo[]) => {
        this.rangoChartConfig.data.labels = data.map(d => d.rango);
        this.rangoChartConfig.data.datasets[0].data = data.map(d => d.cantidad);
        this.rangoChartConfig.options = {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: { title: { display: true, text: 'Rango de Resultado' } },
            y: { 
              title: { display: true, text: 'Cantidad' },
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: function(value: any) {
                  return Number.isInteger(value) ? value : null;
                }
              }
            }
          }
        };
      },
      error: (err: any) => console.error('Error cargando rangos cualitativos:', err)
    });

    // 📊 Documentos por día
    this.reporteService.getDocumentosPorDia().subscribe({
      next: (data: DocumentoPorDia[]) => {
        this.documentosPorDia = data;
        this.lineChartConfig.data.labels = data.map(d => d.fecha);
        this.lineChartConfig.data.datasets[0].data = data.map(d => d.total);
        this.lineChartConfig.options = {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: { title: { display: true, text: 'Fecha' } },
            y: { 
              title: { display: true, text: 'Documentos' },
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: function(value: any) {
                  if (Number.isInteger(value)) {
                    return value;
                  }
                }
              }
            }
          }
        };
      },
      error: (err: any) => console.error('Error cargando documentos por día:', err)
    });

    // 📊 Productividad por empleado
    this.reporteService.getEmpleados().subscribe({
      next: (data: GraficoEmpleado[]) => {
        const nombres = data.map(d => `${d.empleado} ${d.apellido}`);
        const cantidades = data.map(d => d.totalAnalisis);
        this.horizontalBarChartConfig.data.labels = nombres;
        this.horizontalBarChartConfig.data.datasets[0].data = cantidades;
        this.horizontalBarChartConfig.options = {
          responsive: true,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: { 
              title: { display: true, text: 'Cantidad de análisis' },
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: function(value: any) {
                  if (Number.isInteger(value)) {
                    return value;
                  }
                }
              }
            },
            y: { title: { display: true, text: 'Empleado' } }
          }
        };
      },
      error: (err: any) => console.error('Error cargando empleados:', err)
    });
  }

  descargarExcel() {
    this.reporteService.descargarExcel(12, 2025);
  }

  descargarPDF() {
    this.reporteService.descargarPdf(12, 2025);
  }
}