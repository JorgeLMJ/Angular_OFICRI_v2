import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OficioDosaje } from '../../../models/oficio-dosaje.model';
import { OficioDosajeService } from '../../../services/oficio-dosaje.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-oficio-dosaje',
  templateUrl: './oficio-dosaje.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class OficioDosajeComponent implements OnInit {
  oficios: OficioDosaje[] = [];
  searchTerm = '';

  // Paginación (opcional, puedes quitar si no la usas)
  currentPage = 1;
  pageSize = 6;
  maxVisiblePages = 5;

  constructor(
    private oficioDosajeService: OficioDosajeService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadOficios();
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
  // ✅ Nueva función para formatear texto multilínea en la card
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
vistaPrevia(oficio: OficioDosaje): void {
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mesHoy = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'][hoy.getMonth()];
  const anioHoy = hoy.getFullYear();
  const fechaOficio = `${diaHoy} de ${mesHoy} del ${anioHoy}`;

  const nroOficio = oficio.nroInforme || 'S/N';
  const referencia = oficio.referencia || 'OFICIO. N°2844-2025-REGPOL-CUS/DIVOPUS-CUS/COM SAN-SIDF. DEL 08SET2025';
  const dirigido = oficio.dirigido || 'Destinatario no especificado';
  const auxiliar = oficio.auxiliar || 'Auxiliar no especificado';

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Oficio Dosaje - ${nroOficio}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 2.54cm;
      margin-top: 10mm;   
  margin-bottom: 10mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 14pt;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
      background-color: #e0f7fa;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      position: relative;
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }
    .header {
      width: 100%;
      background: white;
      padding: 15px 0;
      border-bottom: 1px solid #ccc;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 80px;
    }
    .header-logo {
      width: 100%;
      max-width: 800px;
      height: auto;
      object-fit: contain;
      border: none;
    }
    .lema-nacional {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      margin: 8px 0;
      color: #003366;
    }
    .fecha-externa {
      text-align: right;
      font-size: 11pt;
      margin: 10px 0 20px 0;
    }
    .main-content {
      flex: 1;
      margin-left: 2cm;
    }
    .oficio-number {
      font-weight: bold;
      text-decoration: underline;
      margin: 10px 0 15px 0;
      font-size: 13pt;
    }
    .section,
    .indent,
    .bullet-list,
    .closing-text,
    .signature-container,
    .image-box {
      margin-bottom: 2px;
    }
    .section {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .section-title-box {
      font-weight: bold;
      min-width: 120px;
      flex-shrink: 0;
      text-align: right;
      margin-top: 15px;
    }
    .section-content-box {
      margin-top: 15px;
      flex: 1;
    }
    .indent {
      text-indent: 3.5cm;
      text-align: justify;
      margin-top: 15px;
    }
    .bullet-list {
      margin-left: 30px;
      padding-left: 0;
    }
    .bullet-list li {
      margin: 5px 0;
    }
    .closing-text {
      text-indent: 4cm;
      text-align: justify;
      margin-top: 15px;
    }
    .signature-container {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      font-size: 11pt;
    }
    .signature-left {
      font-style: italic;
    }
    .signature-right {
      font-weight: bold;
    }
    .image-box {
      width: 50%; 
      height: 150px;
      float: right;
      margin-top: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .image-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border: none;
    }

    /* ✅ PIE DE PÁGINA PERSONALIZADO */
    .custom-footer {
      position: absolute;
      bottom: -220px;
      left: 0;
      width: 100%;
      box-sizing: border-box;
      background-color: white;
      text-align: center;
      font-size: 10pt;
      display: flex;
      flex-direction: column;   
      justify-content: flex-end; 
      align-items: center;  
    }


    .print-button-container {
      position: fixed;
      top: 20px;
      left: 60px;
      z-index: 9999;
      display: flex;
      gap: 10px;
    }
    .print-button, .pdf-button {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .print-button {
      background-color: #198754;
      color: white;
    }
    .pdf-button {
      background-color: #0d6efd;
      color: white;
    }
    @media print {
      .print-button-container { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-button-container">
    <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>
    <button class="pdf-button" onclick="generarPDF()">📄 Generar PDF</button>
  </div>

  <div class="page-container" id="pdf-content">
    <div class="header">
      <img src="/assets/img/logo_oficio.png" class="header-logo" onerror="this.style.display='none'">
    </div>

    <div class="lema-nacional">"Año De La Recuperación y Consolidación De La Economía Peruana"</div>

    <div class="fecha-externa">${fechaOficio}.</div>

    <div class="main-content">
      <div class="oficio-number">OFICIO N°${nroOficio}-2025-COMOPPOL PNP/DIRNOS/REGPOL-CUS/DIVINCRÍ-CUS/OFICRI-DJE.ETL</div>

      <div class="section">
        <div class="section-title-box">SEÑOR(A):</div>
        <div class="section-content-box"><strong>${dirigido.replace(/\n/g, '<br>')}</strong></div>
      </div>

      <div class="section">
        <div class="section-title-box">ASUNTO:</div>
        <div class="section-content-box">Remite Informe Pericial de Dosaje Etílico, por motivo que se indica.</div>
      </div>

      <div class="section">
        <div class="section-title-box">REF.:</div>
        <div class="section-content-box">${referencia}</div>
      </div>

      <div class="indent">
        Tengo el honor de dirigirme a Ud., con la finalidad de remitir, adjunto al presente, el 
        <strong>INFORME PERICIAL DE DOSAJE ETÍLICO N°${nroOficio}/2025</strong>, formulado por el CAP. (S) PNP Javier Alexander HUAMANI CÓRDOVA, 
        identificado con CIP N° 419397, Químico Farmacéutico CQFP N°20289, sobre el examen de dosaje etílico realizado en la muestra biológica 
        (${oficio.tipoMuestra || 'ORINA'}) proporcionada por la persona:
      </div>

      <ul class="bullet-list">
        <li><strong>${oficio.nombreCompleto || 'Nombre no especificado'}</strong></li>
      </ul>

      <div class="closing-text">
        Los documentos son remitidos en cadena de custodia. Es propicia la ocasión para reiterarle los sentimientos de mi especial consideración y deferente estima personal.
      </div>

      <div class="signature-container">
        <div class="signature-left">DFC/${auxiliar}.</div>
        <div class="signature-right">Dios guarde a Ud.</div>
      </div>

      <div class="image-box">
        <img src="/assets/img/sello_oficio.png" onerror="this.style.display='none'">
      </div>
    </div>

    <!-- ✅ PIE DE PÁGINA PERSONALIZADO -->
    <div class="custom-footer">
        Calle Alcides Vigo Hurtado N°-133, distrito de Wánchaq – Cusco. Cel. N°980 121873.<br>
          Email: oficricuscomail.com
    </div>
  </div>

  <script>
    function generarPDF() {
      const { jsPDF } = window.jspdf;
      
      html2canvas(document.getElementById('pdf-content'), {
        scale: 2,
        useCORS: true,
        allowTaint: true
      }).then(canvas => {
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
        pdf.save('oficio_dosaje_${nroOficio}.pdf');
      }).catch(err => {
        alert('❌ Error al generar el PDF. Intente nuevamente.');
        console.error('Error:', err);
      });
    }
  </script>
</body>
</html>
    `);
    printWindow.document.close();
    printWindow.focus();
  }
}
}
