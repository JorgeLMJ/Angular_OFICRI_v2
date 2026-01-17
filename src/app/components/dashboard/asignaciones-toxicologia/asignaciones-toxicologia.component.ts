// src/app/components/dashboard/asignaciones-toxicologia/asignaciones-toxicologia.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core'; // 👈 Agregado ViewChild, ElementRef, etc.
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AsignacionToxicologia, ToxicologiaResultado } from '../../../models/toxicologia.model';
import { AsignacionToxicologiaService } from '../../../services/toxicologia.service';
import { DocumentoService } from '../../../services/documento.service';
import { EmpleadoDTO } from '../../../models/empleado.model';
import { EmpleadoService } from '../../../services/Empleado.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import * as bootstrap from 'bootstrap'; // 👈 Agregado
import jsPDF from 'jspdf'; // 👈 Agregado
import html2canvas from 'html2canvas'; // 👈 Agregado
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe'; // 👈 Agregado

@Component({
  selector: 'app-asignaciones-toxicologia',
  templateUrl: './asignaciones-toxicologia.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe] // 👈 Agregado SafeUrlPipe
})
export class AsignacionesToxicologiaComponent implements OnInit, AfterViewInit, OnDestroy { // 👈 Implementa AfterViewInit, OnDestroy
  asignaciones: AsignacionToxicologia[] = [];
  asignacionesFiltradas: AsignacionToxicologia[] = [];
  searchTerm: string = '';
  empleadosMap: Map<number, EmpleadoDTO> = new Map();

  // 📄 Paginación
  currentPage = 1;
  pageSize = 6;
  maxVisiblePages = 5;

  // 👇 NUEVO: Propiedades para el modal de PDF
  @ViewChild('pdfModal') pdfModalEl!: ElementRef;
  private modalInstance: bootstrap.Modal | null = null;
  currentPdfUrl: string | null = null;
  pdfModalTitle = 'Vista Previa del Informe';

  constructor(
    private asignacionToxService: AsignacionToxicologiaService,
    private documentoService: DocumentoService,
    private empleadoService: EmpleadoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarAsignaciones();
  }

  // 👇 NUEVO: ngAfterViewInit y ngOnDestroy
  ngAfterViewInit(): void {
    if (this.pdfModalEl) {
      this.modalInstance = new bootstrap.Modal(this.pdfModalEl.nativeElement, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
    }
  }

  ngOnDestroy(): void {
    if (this.modalInstance) {
      this.modalInstance.dispose();
    }
  }

  cargarAsignaciones(): void {
    this.asignacionToxService.listar().subscribe({
      next: (data) => {
        const currentUser = this.authService.getCurrentUser();
        const userRole = currentUser?.rol || '';
        let asignacionesFiltradas = data;
        if (userRole === 'Auxiliar de Toxicologia') {
          asignacionesFiltradas = data.filter(a =>
            a.area?.toLowerCase().includes('toxicología') ||
            a.area?.toLowerCase().includes('toxicologia')
          );
        }
        this.asignaciones = asignacionesFiltradas.sort((a, b) =>
          (b.id || 0) - (a.id || 0)
        );
        this.asignacionesFiltradas = [...this.asignaciones];
        this.goToPage(1);
        this.cargarEmpleados(asignacionesFiltradas);
      },
      error: (err) => Swal.fire('Error', 'No se pudieron cargar las asignaciones de toxicología', 'error')
    });
  }

  private cargarEmpleados(asignaciones: AsignacionToxicologia[]): void {
    const empleadoIds = [...new Set(asignaciones.map(a => a.empleadoId))].filter(id => id !== undefined) as number[];
    if (empleadoIds.length > 0) {
      this.empleadoService.getAll().subscribe({
        next: (todosEmpleados: EmpleadoDTO[]) => {
          const empleadosFiltrados = todosEmpleados.filter(emp =>
            emp.id && empleadoIds.includes(emp.id)
          );
          empleadosFiltrados.forEach(emp => {
            if (emp.id) {
              this.empleadosMap.set(emp.id, emp);
            }
          });
        },
        error: (err: any) => console.error('Error al cargar empleados:', err)
      });
    }
  }

  filtrarAsignaciones(): void {
    const term = this.searchTerm.toLowerCase();
    this.asignacionesFiltradas = this.asignaciones.filter(a =>
      a.estado.toLowerCase().includes(term) ||
      a.documentoId.toString().includes(term) ||
      a.empleadoId.toString().includes(term)
    );
    this.goToPage(1);
  }

  nuevaAsignacion(): void {
    this.router.navigate(['/dashboard/asignacion-toxicologia-registro']);
  }

  editarAsignacion(id: number): void {
    this.router.navigate(['/dashboard/asignacion-toxicologia-registro', id]);
  }

  eliminarAsignacion(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede revertir.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.asignacionToxService.eliminar(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'La asignación ha sido eliminada.', 'success');
            this.cargarAsignaciones();
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar la asignación.', 'error')
        });
      }
    });
  }

  // 👇 MODIFICADO: Ahora genera un PDF y lo muestra en un modal
  async vistaPrevia(asignacion: AsignacionToxicologia): Promise<void> {
    const documentoId = asignacion.documentoId;
    if (!documentoId) {
      Swal.fire('⚠️ Advertencia', 'Esta asignación no tiene documento asociado', 'warning');
      return;
    }

    try {
      const doc = await this.documentoService.getDocumentoById(documentoId).toPromise();
      if (!doc) throw new Error('Documento no encontrado');

      const formatFechaInforme = (fecha: string): string => {
        if (!fecha) return '____________';
        const d = new Date(`${fecha}T00:00:00`);
        if (isNaN(d.getTime())) return 'FECHA INVALIDA';
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC'][d.getMonth()];
        const anio = d.getFullYear();
        return `${dia}${mes}${anio}`;
      };

      const listaAnexos = this.getAnexosSeleccionados(doc.anexos);
      const anexosHtml = listaAnexos.length > 0
        ? listaAnexos.map(nombre => `<p style="margin: 2px 0;">- ${nombre}</p>`).join('')
        : '<p>No se especificaron anexos.</p>';

      const currentUser = this.authService.getCurrentUser();
      const userRole = currentUser?.rol || '';
      const nombreUsuarioActual = currentUser?.nombre || 'Usuario del Sistema';
      const fechaIncidente = formatFechaInforme(doc.fechaIncidente);
      const fechaTomaMuestra = formatFechaInforme(doc.fechaActa || doc.fechaIncidente);
      const hoy = new Date();
      const diaHoy = hoy.getDate();
      const mesHoy = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'][hoy.getMonth()];
      const anioHoy = hoy.getFullYear();

      let tituloInforme = 'INFORME PERICIAL TOXICOLÓGICO';
      let rutaFirma = '/assets/img/firma_informe_toxicologico.png';
      let tablaHtml = '';

      if (asignacion.resultados) {
        const clavesSeleccionadas = Object.entries(asignacion.resultados)
          .filter(([clave, valor]) => valor !== undefined && valor !== null)
          .map(([clave, valor]) => ({ clave, valor: valor as string }));

        if (clavesSeleccionadas.length > 0) {
          const nombreDroga = (clave: string): string => {
            const nombres: Record<string, string> = {
              'cocaina': 'Cocaína',
              'marihuana': 'Marihuana',
              'benzodiacepinas': 'Benzodiacepinas',
              'barbituricos': 'Barbitúricos',
              'carbamatos': 'Carbamatos',
              'estricnina': 'Estricnina',
              'cumarinas': 'Cumarinas',
              'organofosforados': 'Organofosforados',
              'misoprostol': 'Misoprostol',
              'piretrinas': 'Piretrinas'
            };
            return nombres[clave] || clave.charAt(0).toUpperCase() + clave.slice(1);
          };

          const resultadosMostrables = clavesSeleccionadas.map(item => ({
            nombre: nombreDroga(item.clave),
            resultado: item.valor
          }));

          if (resultadosMostrables.length <= 6) {
            tablaHtml = `
<table class="results-table" style="width: 45%; margin: 10px auto; border-collapse: collapse; text-align: left;">
<thead>
<tr>
<th style="border: 1px solid #000; padding: 2px; background-color: #f2f2f2; font-weight: bold;">EXAMEN</th>
<th style="border: 1px solid #000; padding: 2px; background-color: #f2f2f2; font-weight: bold;">RESULTADO DEL ANALISIS</th>
</tr>
</thead>
<tbody>
${resultadosMostrables.map(r => `
<tr>
<td style="border: 1px solid #000; padding: 2px;">${r.nombre}</td>
<td style="border: 1px solid #000; padding: 2px;">${r.resultado}</td>
</tr>
`).join('')}
</tbody>
</table>
`;
          } else {
            const mitad = Math.ceil(resultadosMostrables.length / 2);
            const izquierda = resultadosMostrables.slice(0, mitad);
            const derecha = resultadosMostrables.slice(mitad);
            tablaHtml = `
<div style="display: flex; justify-content: space-between; width: 90%;">
<div style="width: 48%;">
<table class="results-table" style="border-collapse: collapse; text-align: left; width: 100%;">
<thead>
<tr>
<th style="border: 1px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold;">EXAMEN</th>
<th style="border: 1px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold;">RESULTADO DEL ANALISIS</th>
</tr>
</thead>
<tbody>
${izquierda.map(r => `
<tr>
<td style="border: 1px solid #000; padding: 5px;">${r.nombre}</td>
<td style="border: 1px solid #000; padding: 5px; font-weight: bold; text-align: center;">${r.resultado}</td>
</tr>
`).join('')}
</tbody>
</table>
</div>
<div style="width: 48%;">
<table class="results-table" style="border-collapse: collapse; text-align: left; width: 100%;">
<thead>
<tr>
<th style="border: 1px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold;">EXAMEN</th>
<th style="border: 1px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold;">RESULTADO DEL ANALISIS</th>
</tr>
</thead>
<tbody>
${derecha.map(r => `
<tr>
<td style="border: 1px solid #000; padding: 5px;">${r.nombre}</td>
<td style="border: 1px solid #000; padding: 5px; font-weight: bold; text-align: center;">${r.resultado}</td>
</tr>
`).join('')}
</tbody>
</table>
</div>
</div>
`;
          }
        } else {
          tablaHtml = `<p class="text-center mt-3">No se registraron resultados de toxicología.</p>`;
        }
      } else {
        tablaHtml = `<p class="text-center mt-3">No se registraron resultados de toxicología.</p>`;
      }

      // 👇 Generar HTML para el PDF
      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; margin: 0 auto; max-width: 800px; padding: 10px; color: #000; font-size: 12px; }
.header { text-align: center; margin-bottom: 3px; }
.header img { width: 150px; margin-bottom: 3px; }
.header h1 { margin: 2px 0; font-size: 12px !important; font-weight: normal; }
.title-container { text-align: center; margin-bottom: 10px; }
.title { font-weight: bold; font-size: 16px; text-decoration: underline; display: inline-block; }
.report-number { text-align: right; font-weight: bold; margin-bottom: 10px; }
.main-content { font-size: 13px; }
.section { margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline; }
.section-title { font-weight: bold; }
.section-content { border-bottom: 1px dotted #000; padding: 1px 5px; }
.full-width-section { margin-top: 15px; }
.full-width-section .section-title { margin-bottom: 8px; font-weight: bold; }
.full-width-section .section-content { border-bottom: none; text-align: justify; }
.results-table { width: 40%; margin: 15px auto; border-collapse: collapse; text-align: center; }
.results-table th, .results-table td { border: 1px solid #000; padding: 2px; }
.signature-area { text-align: center; margin-top: 40px; }
.signature-block { display: inline-block; text-align: center; width: 250px; }
.signature-block p { margin: 2px 0; font-size: 9px; font-weight: bold; }
.date-in-signature { text-align: center !important; margin: 0 0 10px 0 !important; font-size: 12px !important; }
.custom-footer {
position: absolute;
bottom: 0;
left: 0;
width: 100%;
box-sizing: border-box;
background-color: white;
font-size: 7pt;
color: #000;
display: flex;
flex-direction: column;
justify-content: flex-end;
align-items: center;
text-align: center;
padding: 5px 0;
}
</style>
</head>
<body>
<div class="header">
<img src="/assets/img/logo_pnp.png" alt="Logo PNP">
<h1>POLICIA NACIONAL DEL PERU</h1>
<h1>Oficina de Criminalística</h1>
</div>
<div class="title-container">
<span class="title">${tituloInforme}</span>
</div>
<div class="report-number">
Nº ${doc.nro_registro || 'S/N'}/${anioHoy}
</div>
<div class="main-content">
<div class="section">
<span class="section-title">A. PROCEDENCIA</span>
<span class="section-content">: ${doc.procedencia || ''}</span>
</div>
<div class="section">
<span class="section-title">B. ANTECEDENTE</span>
<span class="section-content">: OFICIO. Nº ${doc.nroOficio || 'S/N'} - ${anioHoy} - ${doc.nombreOficio || ''} DEL ${fechaIncidente}</span>
</div>
<div class="section">
<span class="section-title">C. DATOS DEL PERITO</span>
<span class="section-content">: CAP. (S) PNP Javier Alexander HUAMANI CORDOVA, identificada con CIP Nº.419397 Químico Farmacéutico CQFP 20289, con domicilio procesal en la calle Alcides Vigo N°133 Wanchaq - Cusco</span>
</div>
<div class="section">
<span class="section-title">D. HORA DEL INCIDENTE</span>
<span class="section-content">: ${doc.horaIncidente || ''} &nbsp;&nbsp; <b>FECHA:</b> ${fechaIncidente}</span>
</div>
<div class="section">
<span class="section-title">E. HORA DE TOMA DE MUESTRA</span>
<span class="section-content">: ${doc.horaTomaMuestra || ''} &nbsp;&nbsp; <b>FECHA:</b> ${fechaTomaMuestra} (${nombreUsuarioActual})</span>
</div>
<div class="section">
<span class="section-title">F. TIPO DE MUESTRA</span>
<span class="section-content">: ${doc.tipoMuestra || ''}</span>
</div>
<div class="section">
<span class="section-title">G. PERSONA QUE CONDUCE</span>
<span class="section-content">: ${doc.personaQueConduce || ''}</span>
</div>
<div class="section">
<span class="section-title">H. EXAMINADO</span>
<span class="section-content">: ${doc.nombres || ''} ${doc.apellidos || ''} (${doc.edad || ''}), DNI Nº:${doc.dni || ''}</span>
</div>
<div class="section">
<span class="section-title">I. MOTIVACIÓN DEL EXAMEN</span>
<span class="section-content">:D/CL/V/S. (PAF).</span>
</div>
<div class="full-width-section">
<div class="section-title">J.	EXAMEN TOXICOLOGICO Y CRITERIOS CIENTIFICOS</div>
<div class="section-content">
Se procedió a efectuar el examen toxicológico empleando el método de cromatografía de capa fina obteniéndose como resultado:
</div>
</div>
${tablaHtml}
<div class="full-width-section" style="margin-top:-10px">
<div class="section-title">J. CONCLUSIONES</div>
<div class="section-content">
En la muestra M-1 (${doc.tipoMuestra || ''}) analizada dio resultado:
${this.generarTextoConclusiones(asignacion.resultados, doc.tipoMuestra)}
</div>
</div>
<div class="full-width-section">
<div class="section-title">K. ANEXOS</div>
<div style="display: flex; justify-content: space-between; margin-top: 15px;">
<div style="width: 48%;">
<div style="text-align: left; font-size: 12px;">
${anexosHtml}
</div>
</div>
<div style="width: 48%; text-align: center;margin-top:-35px">
<p style="margin-bottom: 50px; font-size: 12px;">
Cusco, ${diaHoy} de ${mesHoy} del ${anioHoy}.
</p>
<img src="${rutaFirma}" alt="Firma del perito" style="width: 200px; height: auto; border: none;">
</div>
</div>
</div>
<div class="custom-footer">
Calle Alcides Vigo Hurtado N°-133, distrito de Wánchaq – Cusco. Cel. N°980 121873.<br>
Email: oficricuscomail.com
</div>
</div>
</body>
</html>
`;

      // 👇 Convertir HTML a PDF usando html2canvas y jsPDF
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.color = '#000';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      const pdfBlob = pdf.output('blob');
      this.currentPdfUrl = URL.createObjectURL(pdfBlob);

      // 👇 Establecer el título dinámico del modal
      this.pdfModalTitle = `OFICIO. Nº ${doc.nroOficio || 'S/N'} - ${anioHoy} - ${doc.nombreOficio || ''} DEL ${fechaIncidente}`;

      if (this.modalInstance) {
        this.modalInstance.show();
      }

      document.body.removeChild(tempDiv);

    } catch (err) {
      console.error('Error al generar PDF:', err);
      Swal.fire('❌ Error', 'No se pudo generar el PDF.', 'error');
    }
  }

  private generarTextoConclusiones(resultados: ToxicologiaResultado, tipoMuestra: string): string {
    if (!resultados) return 'No se registraron resultados.';
    const nombreTecnico = (clave: string): string => {
      const map: Record<string, string> = {
        'cocaina': 'alcaloide de cocaína',
        'marihuana': 'Cannabinoides (Marihuana)',
        'benzodiacepinas': 'Benzodiacepinas',
        'barbituricos': 'Barbitúricos',
        'carbamatos': 'Carbamatos',
        'estricnina': 'Estricnina',
        'cumarinas': 'Cumarinas',
        'organofosforados': 'Organofosforados',
        'misoprostol': 'Misoprostol',
        'piretrinas': 'Piretrinas'
      };
      return map[clave] || clave;
    };
    const resultadosValidos = Object.entries(resultados)
      .filter(([_, valor]) => valor !== undefined && valor !== null)
      .map(([clave, valor]) => ({ clave, valor }));
    if (resultadosValidos.length === 0) {
      return 'No se registraron resultados.';
    }
    const frases = resultadosValidos.map(r => {
      const nombre = nombreTecnico(r.clave);
      return `${r.valor} para presencia de ${nombre}`;
    });
    let texto = '';
    if (frases.length === 1) {
      texto = frases[0];
    } else {
      const ultima = frases.pop();
      texto = frases.join(', ') + ' y ' + ultima;
    }
    return texto + '.';
  }

  private getAnexosSeleccionados(anexos: any): string[] {
    if (!anexos) {
      return [];
    }
    const seleccionados = [];
    if (anexos.cadenaCustodia) seleccionados.push('Cadena de Custodia');
    if (anexos.rotulo) seleccionados.push('Rotulo');
    if (anexos.actaTomaMuestra) seleccionados.push('Acta de Toma de Muestra');
    if (anexos.actaConsentimiento) seleccionados.push('Acta de Consentimiento');
    if (anexos.actaDenunciaVerbal) seleccionados.push('Acta de Denuncia Verbal');
    if (anexos.actaIntervencionPolicial) seleccionados.push('Acta de Intervención Policial');
    if (anexos.copiaDniSidpol) seleccionados.push('Copia de DNI, SIDPOL');
    if (anexos.actaObtencionMuestra) seleccionados.push('Acta de Muestra de Sangre');
    return seleccionados;
  }

  getResultadosArray(resultados: ToxicologiaResultado): { droga: string, resultado: string }[] {
    if (!resultados) return [];
    return Object.entries(resultados)
      .filter(([clave, valor]) => valor !== undefined && valor !== null && (valor === 'Positivo' || valor === 'Negativo'))
      .map(([clave, valor]) => ({
        droga: clave.charAt(0).toUpperCase() + clave.slice(1).replace(/([A-Z])/g, ' $1'),
        resultado: valor as string
      }));
  }

  // 📄 MÉTODOS DE PAGINACIÓN
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.asignacionesFiltradas.length / this.pageSize));
  }

  get paginatedAsignaciones(): AsignacionToxicologia[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.asignacionesFiltradas.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const half = Math.floor(this.maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);
    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  trackByPage(_: number, page: number): number {
    return page;
  }

  // 👇 NUEVO: Método para convertir imagen a base64 (igual que en documento.component.ts)
  private async imageUrlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}