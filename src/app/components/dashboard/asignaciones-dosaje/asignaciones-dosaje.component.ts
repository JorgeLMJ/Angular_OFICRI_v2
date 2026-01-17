// src/app/components/dashboard/asignaciones-dosaje/asignaciones-dosaje.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core'; // 👈 Agregado hooks
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AsignacionDosaje } from '../../../models/dosaje.model';
import { DosajeService } from '../../../services/dosaje.service';
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
  selector: 'app-asignaciones-dosaje',
  templateUrl: './asignaciones-dosaje.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe] // 👈 Agregado SafeUrlPipe
})
export class AsignacionesDosajeComponent implements OnInit, AfterViewInit, OnDestroy { // 👈 Implementa hooks
  asignaciones: AsignacionDosaje[] = [];
  searchTerm = '';
  asignacionesFiltradas: AsignacionDosaje[] = [];
  currentUserRole: string = '';

  // 📄 Paginación
  currentPage = 1;
  pageSize = 6;
  maxVisiblePages = 5;

  // ✅ Mapa de empleados
  empleadosMap: Map<number, EmpleadoDTO> = new Map();

  // 👇 NUEVO: Propiedades para el modal de PDF
  @ViewChild('pdfModal') pdfModalEl!: ElementRef;
  private modalInstance: bootstrap.Modal | null = null;
  currentPdfUrl: string | null = null;
  pdfModalTitle = 'Vista Previa del Informe';

  constructor(
    private dosajeService: DosajeService,
    private documentoService: DocumentoService,
    private empleadoService: EmpleadoService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserRole = user?.rol || '';
    this.loadAsignaciones();
    this.cargarEmpleados();
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

  get esQuimicoFarmaceutico(): boolean {
    return this.currentUserRole === 'Quimico Farmaceutico';
  }

  loadAsignaciones(): void {
    this.dosajeService.listar().subscribe({
      next: (data: AsignacionDosaje[]) => {
        this.asignaciones = data.sort((a, b) => 
          (b.id || 0) - (a.id || 0)
        );
        this.applyFilter();
        this.goToPage(1);
      },
      error: (err: any) => {
        console.error('Error cargando asignaciones', err);
        Swal.fire('❌ Error', 'No se pudieron cargar las asignaciones', 'error');
      }
    });
  }

  private cargarEmpleados(): void {
    this.empleadoService.getAll().subscribe({
      next: (empleados: EmpleadoDTO[]) => {
        empleados.forEach(emp => {
          if (emp.id) {
            this.empleadosMap.set(emp.id, emp);
          }
        });
      },
      error: (err: any) => {
        console.error('Error al cargar empleados', err);
      }
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    if (!term) {
      this.asignacionesFiltradas = [...this.asignaciones];
    } else {
      this.asignacionesFiltradas = this.asignaciones.filter(asignacion =>
        asignacion.area.toLowerCase().includes(term) ||
        asignacion.estado.toLowerCase().includes(term) ||
        asignacion.cualitativo?.toLowerCase().includes(term)
      );
    }
    this.goToPage(1);
  }

  nuevaAsignacion(): void {
    this.router.navigate(['/dashboard/asignacion-dosaje-registro']);
  }

  editarAsignacion(id: number): void {
    this.router.navigate(['/dashboard/asignacion-dosaje-registro', id]);
  }

  // 👇 MODIFICADO: Ahora genera un PDF y lo muestra en un modal
  async vistaPreviaAsignacion(asignacion: AsignacionDosaje): Promise<void> {
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

      let tituloInforme = doc.nombreDocumento || 'INFORME PERICIAL DE DOSAJE ETÍLICO';
      let rutaFirma = '/assets/img/firma_informe_dosaje.png';

      const valorCuantitativo = asignacion.cualitativo != null 
        ? asignacion.cualitativo + ' g/l' 
        : '0.0 g/l';

      // 👇 Generar HTML para el PDF
      const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #000; font-size: 12px;">
  <!-- Encabezado -->
  <div style="text-align: center; margin-bottom: 3px;">
    <img src="/assets/img/logo_pnp.png" alt="Logo PNP" style="width: 150px; margin-bottom: 3px;">
    <h1 style="margin: 2px 0; font-size: 12px; font-weight: normal;">POLICIA NACIONAL DEL PERU</h1>
    <h1 style="margin: 2px 0; font-size: 12px; font-weight: normal;">Oficina de Criminalística</h1>
  </div>

  <!-- Título -->
  <div style="text-align: center; margin-bottom: 10px;">
    <span style="font-weight: bold; font-size: 16px; text-decoration: underline; display: inline-block;">${tituloInforme}</span>
  </div>

  <!-- Número de informe -->
  <div style="text-align: right; font-weight: bold; margin-bottom: 10px;">
    Nº ${doc.nro_registro || 'S/N'}/${anioHoy}
  </div>

  <!-- Secciones A-H -->
  <div style="font-size: 13px;">
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">A. PROCEDENCIA</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: ${doc.procedencia || ''}</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">B. ANTECEDENTE</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: OFICIO. Nº ${doc.nroOficio || 'S/N'} - ${anioHoy} - ${doc.nombreOficio || ''} DEL ${fechaIncidente}</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">C. DATOS DEL PERITO</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: CAP. (S) PNP Javier Alexander HUAMANI CORDOVA, identificada con CIP Nº.419397 Químico Farmacéutico CQFP 20289, con domicilio procesal en la calle Alcides Vigo N°133 Wanchaq - Cusco</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">D. HORA DEL INCIDENTE</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: ${doc.horaIncidente || ''} &nbsp;&nbsp; <b>FECHA:</b> ${fechaIncidente}</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">E. HORA DE TOMA DE MUESTRA</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: ${doc.horaTomaMuestra || ''} &nbsp;&nbsp; <b>FECHA:</b> ${fechaTomaMuestra} (${nombreUsuarioActual})</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">F. TIPO DE MUESTRA</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: ${doc.tipoMuestra || ''}</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">G. PERSONA QUE CONDUCE</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: ${doc.personaQueConduce || ''}</span>
    </div>
    <div style="margin-bottom: 12px; display: grid; grid-template-columns: 200px 1fr; align-items: baseline;">
      <span style="font-weight: bold;">H. EXAMINADO</span>
      <span style="border-bottom: 1px dotted #000; padding: 1px 5px;">: ${doc.nombres || ''} ${doc.apellidos || ''} (${doc.edad || ''}), DNI Nº:${doc.dni || ''}</span>
    </div>
  </div>

  <!-- I. MOTIVACIÓN DEL EXAMEN -->
  <div style="margin-top: 15px; font-size: 13px;">
    <div style="margin-bottom: 8px; font-weight: bold;">I. MOTIVACIÓN DEL EXAMEN DE DOSAJE ETILICO Y CRITERIOS CIENTIFICOS</div>
    <div style="text-align: justify;">
      Motivo del examen ${doc.delitoInfraccion || ''}. Se procedió a efectuar el examen de dosaje etílico, empleando la prueba cualitativa, con el siguiente resultado:
    </div>
  </div>

  <!-- TABLA DINÁMICA -->
  <table style="width: 40%; margin: 15px auto; border-collapse: collapse; text-align: center; font-size: 12px;">
    <tr><th style="border: 1px solid #000; padding: 2px;">EXAMEN</th><th style="border: 1px solid #000; padding: 2px;">M-1</th></tr>
    <tr><td style="border: 1px solid #000; padding: 2px;">Cualitativo</td><td style="border: 1px solid #000; padding: 2px;"><strong>${doc.cualitativo || ''}</strong></td></tr>
    <tr><td style="border: 1px solid #000; padding: 2px;">Cuantitativo</td><td style="border: 1px solid #000; padding: 2px;"><strong>${valorCuantitativo}</strong></td></tr>
  </table>

  <!-- J. CONCLUSIONES -->
  <div style="margin-top: 15px; font-size: 13px;">
    <div style="margin-bottom: 8px; font-weight: bold;">J. CONCLUSIONES</div>
    <div style="text-align: justify;">
      En la muestra M-1 (${doc.tipoMuestra || ''}) analizada se obtuvo un resultado <strong>${doc.cualitativo || ''}</strong> para examen cualitativo
      y de alcoholemia<strong> ${valorCuantitativo} (Cero gramos con cero cero cg x l. de sangre)</strong> en analisis cuantitativo. La muestra procesada queda en laboratorio en calidad de 
      custodia durante el tiempo establecido por ley (Directiva N° 18-03-27)
    </div>
  </div>

  <!-- K. ANEXOS -->
  <div style="margin-top: 15px; font-size: 13px;">
    <div style="margin-bottom: 8px; font-weight: bold;">K. ANEXOS</div>
    <div style="display: flex; justify-content: space-between; margin-top: 15px;">
      <div style="width: 48%; text-align: left; font-size: 12px;">
        ${anexosHtml}
      </div>
      <div style="width: 48%; text-align: center; margin-top: -35px;">
        <p style="margin-bottom: 80px; font-size: 12px;">Cusco, ${diaHoy} de ${mesHoy} del ${anioHoy}.</p>
        <img src="${rutaFirma}" alt="Firma del perito" style="width: 200px; height: auto; border: none;">
      </div>
    </div>
  </div>

  <!-- ✅ PIE DE PÁGINA (modificado) -->
  <div style="position: absolute; bottom: 0; left: 0; width: 100%; box-sizing: border-box; background-color: white; font-size: 7pt; color: #000; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; text-align: center; padding: 5px 0;">
    Calle Alcides Vigo Hurtado N°-133, distrito de Wánchaq – Cusco. Cel. N°980 121873.<br>
    Email: oficricuscomail.com
  </div>
</div>
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

  // 📄 MÉTODOS DE PAGINACIÓN
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.asignacionesFiltradas.length / this.pageSize));
  }

  get paginatedAsignaciones(): AsignacionDosaje[] {
    const start = (this.currentPage -  1) * this.pageSize;
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

  // 👇 NUEVO: Método para convertir imagen a base64
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