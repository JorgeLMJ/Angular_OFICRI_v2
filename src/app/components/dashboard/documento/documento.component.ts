// src/app/components/dashboard/documento/documento.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Documento } from '../../../models/documento.model';
import { DocumentoService } from '../../../services/documento.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import * as bootstrap from 'bootstrap';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';

@Component({
  selector: 'app-documento',
  templateUrl: './documento.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe]
})
export class DocumentoComponent implements OnInit, AfterViewInit, OnDestroy {
  documentos: Documento[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 6;
  maxVisiblePages = 5;

  @ViewChild('pdfModal') pdfModalEl!: ElementRef;
  private modalInstance: bootstrap.Modal | null = null;
  currentPdfUrl: string | null = null;

  // 👇 NUEVA PROPIEDAD: Para el título dinámico del modal
  pdfModalTitle = 'Vista Previa del Informe';

  constructor(
    private documentoService: DocumentoService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDocumentos();
  }

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

  nuevoDocumento(): void {
    this.router.navigate(['/dashboard/documento-registro']);
  }

  editarDocumento(id: number): void {
    this.router.navigate(['/dashboard/documento', id, 'editar']);
  }

  loadDocumentos(): void {
    this.documentoService.getDocumentos().subscribe({
      next: (data) => {
        this.documentos = (data ?? []).sort((a, b) => {
          const fechaA = new Date(a.fechaIngreso);
          const fechaB = new Date(b.fechaIngreso);
          return fechaB.getTime() - fechaA.getTime();
        });
        this.goToPage(1);
      },
      error: (err) => console.error('Error cargando documentos', err)
    });
  }

  get filteredDocumentos(): Documento[] {
    const q = this.searchTerm.trim().toLowerCase();
    const currentUser = this.authService.getCurrentUser();
    const userRole = currentUser?.rol || '';
    let documentosPorRol = this.documentos;
    if (userRole === 'Auxiliar de Dosaje') {
      documentosPorRol = this.documentos.filter(doc =>
        doc.nombreDocumento?.toUpperCase().includes('DOSAJE')
      );
    } else if (userRole === 'Auxiliar de Toxicologia') {
      documentosPorRol = this.documentos.filter(doc =>
        doc.nombreDocumento?.toUpperCase().includes('TOXICOLÓGIA') ||
        doc.nombreDocumento?.toUpperCase().includes('TOXICOLOGIA')
      );
    }
    if (!q) return documentosPorRol;
    return documentosPorRol.filter(doc =>
      doc.nroOficio.toLowerCase().includes(q) ||
      doc.procedencia.toLowerCase().includes(q) ||
      doc.nombres.toLowerCase().includes(q) ||
      doc.apellidos.toLowerCase().includes(q) ||
      doc.dni.toLowerCase().includes(q) ||
      doc.asunto.toLowerCase().includes(q) ||
      doc.situacion.toLowerCase().includes(q) ||
      doc.tipoMuestra?.toLowerCase().includes(q) ||
      doc.personaQueConduce?.toLowerCase().includes(q) ||
      doc.cualitativo?.toLowerCase().includes(q) ||
      doc.nro_registro.toString().includes(q) ||
      (doc.nombreDocumento || '').toLowerCase().includes(q)
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDocumentos.length / this.pageSize));
  }

  get paginatedDocumentos(): Documento[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  goToPage(p: number): void {
    this.currentPage = Math.min(Math.max(1, p), this.totalPages);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
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

  trackById(_: number, item: Documento): number {
    return item.id!;
  }

  trackByPage(_: number, page: number): number {
    return page;
  }

  formatDate(dateString: string): string {
    if (!dateString || !dateString.includes('-')) return 'N/A';
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getAnexosSeleccionados(anexos: any): string[] {
    if (!anexos) return [];
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

  // ✅ Método actualizado: genera PDF con tabla y valores correctos
  async vistaPrevia(doc: Documento): Promise<void> {
    try {
      // === LÓGICA DEL SEGUNDO CÓDIGO ===
      const currentUser = this.authService.getCurrentUser();
      const userRole = currentUser?.rol || '';
      const nombreUsuarioActual = currentUser?.nombre || 'Usuario del Sistema';

      let tituloInforme = doc.nombreDocumento || 'INFORME PERICIAL';
      let rutaFirma = '/assets/img/firma_informe_dosaje.png';

      if (!doc.nombreDocumento) {
        if (userRole === 'Auxiliar de Dosaje') {
          tituloInforme = 'INFORME PERICIAL DE DOSAJE ETÍLICO';
          rutaFirma = '/assets/img/firma_informe_dosaje.png';
        } else if (userRole === 'Auxiliar de Toxicologia') {
          tituloInforme = 'INFORME PERICIAL TOXICOLÓGICO';
          rutaFirma = '/assets/img/firma_informe_toxicologico.png';
        }
      } else {
        if (doc.nombreDocumento.includes('DOSAJE')) {
          rutaFirma = '/assets/img/firma_informe_dosaje.png';
        } else if (doc.nombreDocumento.includes('TOXICOLÓGICO') || doc.nombreDocumento.includes('TOXICOLOGIA')) {
          rutaFirma = '/assets/img/firma_informe_toxicologico.png';
        }
      }

      const valorCualitativo = doc.cualitativo || '';
      let valorCuantitativo = '0.0 g/l';
      let valorCuantitativoTexto = '0.0 g/l (Cero gramos con cero cero cg x l. de sangre)';
      
      if (userRole === 'Auxiliar de Toxicologia') {
        valorCuantitativo = valorCualitativo;
        valorCuantitativoTexto = valorCualitativo;
      }

      const formatFechaInforme = (fecha: string): string => {
        if (!fecha) return '____________';
        const d = new Date(`${fecha}T00:00:00`);
        if (isNaN(d.getTime())) return 'FECHA INVALIDA';
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC'][d.getMonth()];
        const anio = d.getFullYear();
        return `${dia}${mes}${anio}`;
      };

      const fechaIncidente = formatFechaInforme(doc.fechaIncidente);
      const fechaTomaMuestra = formatFechaInforme(doc.fechaActa || doc.fechaIncidente);
      const hoy = new Date();
      const diaHoy = hoy.getDate();
      const mesHoy = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'][hoy.getMonth()];
      const anioHoy = hoy.getFullYear();

      const listaAnexos = this.getAnexosSeleccionados(doc.anexos);
      const anexosHtml = listaAnexos.length > 0
        ? listaAnexos.map(nombre => `<p style="margin: 2px 0;">- ${nombre}</p>`).join('')
        : '<p>No se especificaron anexos.</p>';

      // === FIN LÓGICA DEL SEGUNDO CÓDIGO ===

      // Convertir firma a base64
      const firmaBase64 = await this.imageUrlToBase64(rutaFirma);
      const logoBase64 = await this.imageUrlToBase64('/assets/img/logo_pnp.png');

      // Generar HTML con los valores correctos
      const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #000; font-size: 12px;">
    <!-- Encabezado -->
    <div style="text-align: center; margin-bottom: 3px;">
      <img src="${logoBase64}" alt="Logo PNP" style="width: 150px; margin-bottom: 3px;">
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
      <div style="margin-bottom: 8px; font-weight: bold;">I. MOTIVACIÓN DEL EXAMEN</div>
      <div style="text-align: justify;">
        Motivo del examen ${doc.delitoInfraccion || ''}. Se procedió a efectuar el examen, con el siguiente resultado:
      </div>
    </div>

    <!-- TABLA DINÁMICA -->
    <table style="width: 40%; margin: 15px auto; border-collapse: collapse; text-align: center; font-size: 12px;">
      <tr><th style="border: 1px solid #000; padding: 2px;">EXAMEN</th><th style="border: 1px solid #000; padding: 2px;">M-1</th></tr>
      <tr><td style="border: 1px solid #000; padding: 2px;">Cualitativo</td><td style="border: 1px solid #000; padding: 2px;"><strong>${valorCualitativo}</strong></td></tr>
      <tr><td style="border: 1px solid #000; padding: 2px;">Cuantitativo</td><td style="border: 1px solid #000; padding: 2px;"><strong>${valorCuantitativo}</strong></td></tr>
    </table>

    <!-- J. CONCLUSIONES -->
    <div style="margin-top: 15px; font-size: 13px;">
      <div style="margin-bottom: 8px; font-weight: bold;">J. CONCLUSIONES</div>
      <div style="text-align: justify;">
        En la muestra M-1 (${doc.tipoMuestra || ''}) analizada se obtuvo un resultado <strong>${valorCualitativo}</strong> para examen cualitativo
        y de alcoholemia<strong> ${valorCuantitativoTexto}</strong> en análisis cuantitativo. La muestra procesada queda en laboratorio en calidad de 
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
          <img src="${firmaBase64}" alt="Firma del perito" style="width: 200px; height: auto; border: none;">
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

      // 👇 👇 👇 LÍNEA AGREGADA: Define el título del modal usando el antecedente 👇 👇 👇
      this.pdfModalTitle = `OFICIO. Nº ${doc.nroOficio || 'S/N'} - ${anioHoy} - ${doc.nombreOficio || ''} DEL ${fechaIncidente}`;

      // Crear contenedor temporal
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

      // Generar PDF
      const canvas = await html2canvas(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      const pdfBlob = pdf.output('blob');
      this.currentPdfUrl = URL.createObjectURL(pdfBlob);

      if (this.modalInstance) {
        this.modalInstance.show();
      }

      document.body.removeChild(tempDiv);
      
    } catch (err) {
      console.error('Error al generar PDF:', err);
      Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    }
  }

  // ✅ Función para convertir imagen a base64
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