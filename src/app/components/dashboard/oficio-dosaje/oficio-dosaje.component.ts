// src/app/components/dashboard/oficio-dosaje/oficio-dosaje.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OficioDosaje } from '../../../models/oficio-dosaje.model';
import { OficioDosajeService } from '../../../services/oficio-dosaje.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import * as bootstrap from 'bootstrap';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';

@Component({
  selector: 'app-oficio-dosaje',
  templateUrl: './oficio-dosaje.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe]
})
export class OficioDosajeComponent implements OnInit, AfterViewInit, OnDestroy {
  oficios: OficioDosaje[] = [];
  searchTerm = '';

  // Paginación
  currentPage = 1;
  pageSize = 6;
  maxVisiblePages = 5;

  // 👇 NUEVO: Propiedades para el modal de PDF
  @ViewChild('pdfModal') pdfModalEl!: ElementRef;
  private modalInstance: bootstrap.Modal | null = null;
  currentPdfUrl: string | null = null;
  pdfModalTitle = 'Vista Previa del Oficio';

  constructor(
    private oficioDosajeService: OficioDosajeService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadOficios();
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

  nuevoOficio(): void {
    this.router.navigate(['/dashboard/oficio-dosaje-registro']);
  }

  editarOficio(id: number): void {
    this.router.navigate(['/dashboard/oficio-dosaje-registro', id]);
  }

  loadOficios(): void {
    this.oficioDosajeService.listar().subscribe({
      next: (data) => {
        this.oficios = data ?? [];
        this.goToPage(1);
      },
      error: (err) => {
        console.error('Error cargando oficios', err);
        Swal.fire('❌ Error', 'No se pudieron cargar los oficios', 'error');
      }
    });
  }

  formatMultiline(text: string | null | undefined): string {
    if (!text) return '—';
    return text.replace(/\n/g, '<br>');
  }

  get filteredOficios(): OficioDosaje[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return [...this.oficios];
    return this.oficios.filter(oficio =>
      oficio.nombreOficio?.toLowerCase().includes(q) ||
      oficio.nroInforme?.toLowerCase().includes(q) ||
      oficio.dirigido?.toLowerCase().includes(q) ||
      oficio.nombreCompleto?.toLowerCase().includes(q) ||
      oficio.documentoId?.toString().includes(q)
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOficios.length / this.pageSize));
  }

  get paginatedOficios(): OficioDosaje[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOficios.slice(start, start + this.pageSize);
  }

  goToPage(p: number): void {
    this.currentPage = Math.min(Math.max(1, p), this.totalPages);
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



  async vistaPrevia(oficio: OficioDosaje): Promise<void> {
    try {
      const hoy = new Date();
      const diaHoy = hoy.getDate();
      const mesHoy = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'][hoy.getMonth()];
      const anioHoy = hoy.getFullYear();
      const fechaOficio = `${diaHoy} de ${mesHoy} del ${anioHoy}`;

      const nroOficio = oficio.nroInforme || 'S/N';
      const referencia = oficio.referencia || 'OFICIO. N°2844-2025-REGPOL-CUS/DIVOPUS-CUS/COM SAN-SIDF. DEL 08SET2025';
      const dirigido = oficio.dirigido || 'Destinatario no especificado';
      const auxiliar = oficio.auxiliar || 'Auxiliar no especificado';

      // 👇 Generar HTML para el PDF (sin color de fondo, con fuente 12pt)
      const htmlContent = `
<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; width: 210mm; height: 297mm; box-sizing: border-box; padding: 25.4mm;">
  <div style="position: relative; width: 100%; min-height: 100%; display: flex; flex-direction: column;">

    <!-- Encabezado: Imagen y lema -->
    <div style="width: 100%; background: white; padding: 0; border-bottom: 1px solid #ccc; display: flex; justify-content: center; align-items: flex-start; margin-top: -70px;">
      <img src="/assets/img/logo_oficio.png" style="width: 100%; max-width: 800px; height: auto; object-fit: contain; border: none;" onerror="this.style.display='none'">
    </div>

    <!-- Lema en negro oscuro -->
    <div style="text-align: center; font-size: 11pt; font-weight: bold; margin: 5px 0 10px 0; color: #000;">
      "Año De La Recuperación y Consolidación De La Economía Peruana"
    </div>

    <!-- Fecha -->
    <div style="text-align: right; font-size: 10pt; margin: 10px 0 20px 0;">
      ${fechaOficio}.
    </div>

    <!-- Cuerpo del oficio -->
    <div style="flex: 1; margin-left: 2cm;">
      <div style="font-weight: bold; text-decoration: underline; margin: 10px 0 15px 0; font-size: 12pt;">
        OFICIO N°${nroOficio}-2025-COMOPPOL PNP/DIRNOS/REGPOL-CUS/DIVINCRÍ-CUS/OFICRI-DJE.ETL
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <div style="font-weight: bold; min-width: 120px; flex-shrink: 0; text-align: right; margin-top: 15px;">SEÑOR(A):</div>
        <div style="margin-top: 15px; flex: 1;"><strong>${dirigido.replace(/\n/g, '<br>')}</strong></div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <div style="font-weight: bold; min-width: 120px; flex-shrink: 0; text-align: right; margin-top: 15px;">ASUNTO:</div>
        <div style="margin-top: 15px; flex: 1;">Remite Informe Pericial de Dosaje Etílico, por motivo que se indica.</div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <div style="font-weight: bold; min-width: 120px; flex-shrink: 0; text-align: right; margin-top: 15px;">REF.:</div>
        <div style="margin-top: 15px; flex: 1;">${referencia}</div>
      </div>

      <div style="text-indent: 3.5cm; text-align: justify; margin-top: 15px;">
        Tengo el honor de dirigirme a Ud., con la finalidad de remitir, adjunto al presente, el 
        <strong>INFORME PERICIAL DE DOSAJE ETÍLICO N°${nroOficio}/2025</strong>, formulado por el CAP. (S) PNP Javier Alexander HUAMANI CÓRDOVA, 
        identificado con CIP N° 419397, Químico Farmacéutico CQFP N°20289, sobre el examen de dosaje etílico realizado en la muestra biológica 
        (${oficio.tipoMuestra || 'ORINA'}) proporcionada por la persona:
      </div>

      <ul style="margin-left: 30px; padding-left: 0; margin-top: 15px;">
        <li style="margin: 5px 0;"><strong>${oficio.nombreCompleto || 'Nombre no especificado'}</strong></li>
      </ul>

      <div style="text-indent: 4cm; text-align: justify; margin-top: 15px;">
        Los documentos son remitidos en cadena de custodia. Es propicia la ocasión para reiterarle los sentimientos de mi especial consideración y deferente estima personal.
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 10pt;">
        <div style="font-style: italic;">DFC/${auxiliar}.</div>
        <div style="font-weight: bold;">Dios guarde a Ud.</div>
      </div>

      <div style="width: 50%; height: 150px; float: right; margin-top: 50px; display: flex; justify-content: center; align-items: center;">
        <img src="/assets/img/sello_oficio.png" style="max-width: 100%; max-height: 100%; object-fit: contain; border: none;" onerror="this.style.display='none'">
      </div>
    </div>

    <div class="custom-footer" style="margin-top: 100px; text-align: center; font-size: 9pt; padding: 10px 0; border-top: 1px ; background-color: white; width: 100%;">
    <div style="margin-top: -100px; text-align: center; font-size: 9pt; padding: 10px 0; border-top: 1px solid #ccc; background-color: white; width: 100%;">
  Calle Alcides Vigo Hurtado N°-133, distrito de Wánchaq – Cusco. Cel. N°980 121873.<br>
  Email: oficricuscomail.com
</div>

  </div>
</div>
`;

      // 👇 Convertir HTML a PDF usando html2canvas y jsPDF
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      const pdfBlob = pdf.output('blob');
      this.currentPdfUrl = URL.createObjectURL(pdfBlob);

      // 👇 Establecer el título dinámico del modal
      this.pdfModalTitle = `OFICIO N°${nroOficio}-2025`;

      if (this.modalInstance) {
        this.modalInstance.show();
      }

      document.body.removeChild(tempDiv);

    } catch (err) {
      console.error('Error al generar PDF:', err);
      Swal.fire('❌ Error', 'No se pudo generar el PDF.', 'error');
    }
  }
}
