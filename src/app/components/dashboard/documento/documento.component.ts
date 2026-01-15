import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Documento } from '../../../models/documento.model';
import { DocumentoService } from '../../../services/documento.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-documento',
  templateUrl: './documento.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DocumentoComponent implements OnInit {
  documentos: Documento[] = [];
  searchTerm = '';

  // Paginación
  currentPage = 1;
  pageSize = 6;
  maxVisiblePages = 5;

  constructor(
    private documentoService: DocumentoService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDocumentos();
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
      // ✅ Ordenar por fechaIngreso descendente (más reciente primero)
      this.documentos = (data ?? []).sort((a, b) => {
        const fechaA = new Date(a.fechaIngreso);
        const fechaB = new Date(b.fechaIngreso);
        return fechaB.getTime() - fechaA.getTime(); // Descendente
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

    // Filtrar por rol del usuario
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
    // Si el rol no es ninguno de los dos (ej. admin), se muestran todos

    // Aplicar búsqueda adicional si hay término
    if (!q) {
      return documentosPorRol;
    }

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

  trackById(_: number, item: Documento): number {
    return item.id!;
  }

  trackByPage(_: number, page: number): number {
    return page;
  }

  formatDate(dateString: string): string {
    if (!dateString || !dateString.includes('-')) {
      return 'N/A';
    }
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getAnexosSeleccionados(anexos: any): string[] {
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

  vistaPrevia(doc: Documento): void {
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

    // ✅ Usar nombreDocumento si existe, sino usar lógica por rol
    let tituloInforme = doc.nombreDocumento || 'INFORME PERICIAL';
    let rutaFirma = '/assets/img/firma_informe_dosaje.png';
    
    // Si no hay nombreDocumento, usar rol para definir título y firma
    if (!doc.nombreDocumento) {
      if (userRole === 'Auxiliar de Dosaje') {
        tituloInforme = 'INFORME PERICIAL DE DOSAJE ETÍLICO';
        rutaFirma = '/assets/img/firma_informe_dosaje.png';
      } else if (userRole === 'Auxiliar de Toxicologia') {
        tituloInforme = 'INFORME PERICIAL TOXICOLÓGICO';
        rutaFirma = '/assets/img/firma_informe_toxicologico.png';
      }
    } else {
      // Si hay nombreDocumento, usar firma según el contenido del título
      if (doc.nombreDocumento.includes('DOSAJE')) {
        rutaFirma = '/assets/img/firma_informe_dosaje.png';
      } else if (doc.nombreDocumento.includes('TOXICOLÓGICO') || doc.nombreDocumento.includes('TOXICOLOGIA')) {
        rutaFirma = '/assets/img/firma_informe_toxicologico.png';
      }
    }

    // ✅ Valores para la tabla
    const valorCualitativo = doc.cualitativo || '';
    let valorCuantitativo = '0.0 g/l';
    let valorCuantitativoTexto = '0.0 g/l (Cero gramos con cero cero cg x l. de sangre)';
    
    if (userRole === 'Auxiliar de Dosaje') {
      valorCuantitativo = '0.0 g/l';
      valorCuantitativoTexto = '0.0 g/l (Cero gramos con cero cero cg x l. de sangre)';
    } else if (userRole === 'Auxiliar de Toxicologia') {
      valorCuantitativo = valorCualitativo;
      valorCuantitativoTexto = valorCualitativo;
    }

    const fechaIncidente = formatFechaInforme(doc.fechaIncidente);
    const fechaTomaMuestra = formatFechaInforme(doc.fechaActa || doc.fechaIncidente);

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'][hoy.getMonth()];
    const anioHoy = hoy.getFullYear();

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>.</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0 auto; 
            max-width: 800px; 
            padding: 10px; 
              color: #000; 
            font-size: 12px; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 10px; 
        }
        .header img { 
            width: 150px; 
            margin-bottom: 10px; 
        }
        .header h1 { 
            margin: 2px 0; 
            font-size: 12px !important; 
            font-weight: normal; 
        }
        .title-container { 
            text-align: center; 
            margin-bottom: 30px; 
        }
        .title { 
            font-weight: bold; 
            font-size: 16px; 
            text-decoration: underline; 
            display: inline-block; 
        }
        .report-number { 
            text-align: right; 
            font-weight: bold; 
            margin-bottom: 10px; 
        }
        .main-content { 
            font-size: 13px; 
        }
        .section { 
            margin-bottom: 12px; 
            display: grid; 
            grid-template-columns: 200px 1fr; 
            align-items: baseline; 
        }
        .section-title { 
            font-weight: bold; 
        }
        .section-content { 
            border-bottom: 1px dotted #000; 
            padding: 1px 5px; 
        }
        .full-width-section { 
            margin-top: 15px; 
        }
        .full-width-section .section-title { 
            margin-bottom: 8px; 
            font-weight: bold; 
        }
        .full-width-section .section-content { 
            border-bottom: none; 
            text-align: justify; 
        }
        .results-table { 
            width: 40%; 
            margin: 15px auto; 
            border-collapse: collapse; 
            text-align: center; 
        }
        .results-table th, .results-table td { 
            border: 1px solid #000; 
            padding: 2px; 
        }

        .signature-block { 
            display: inline-block;      
            text-align: center; 
            width: 250px;
        }
        .signature-block p { 
            margin: 2px 0; 
            font-size: 9px; 
            font-weight: bold;
        }
        .date-in-signature { 
            text-align: center !important;
            margin: 0 0 50px 0 !important;
            font-size: 12px !important;
        }
        .print-button-container { 
            position: fixed; 
            top: 20px; 
            left: 20px; 
            z-index: 9999; 
        }
        .print-button { 
            padding: 10px 20px; 
            background-color: #198754; 
            color: white; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
        }
        @media print { 
            .print-button-container { display: none; } 
        }
    </style>
</head>
<body>
    <div class="print-button-container">
        <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>
    </div>

    <div class="header">
        <img src="/assets/img/logo_pnp.png" alt="Logo PNP">
        <h1>POLICIA NACIONAL DEL PERU</h1>
        <h1>Oficina de Criminalística</h1>
    </div>
    <div class="title-container">
        <span class="title">${doc.nombreDocumento || tituloInforme}</span>
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
            <span class="section-content">: CAP. (S) PNP Javier Alexander HUAMANI CORDOVA, identificada con CIP Nº.419397 Químico 
            Farmacéutico CQFP 20289, con domicilio procesal en la calle Alcides Vigo N°133 Wanchaq - Cusco</span>
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
        <div class="full-width-section">
            <div class="section-title">I. MOTIVACIÓN DEL EXAMEN</div>
            <div class="section-content">
                Motivo del examen ${doc.delitoInfraccion || ''}. Se procedió a efectuar el examen, con el siguiente resultado:
            </div>
        </div>
        
        <!-- ✅ TABLA DINÁMICA SEGÚN ROL -->
        <table class="results-table">
          <tr> <th>EXAMEN</th> <th>M-1</th> </tr>
          <tr> <td>Cualitativo</td> <td><strong>${valorCualitativo}</strong></td> </tr>
          <tr> <td>Cuantitativo</td> <td><strong>${valorCuantitativo}</strong></td> </tr>
        </table>

        <div class="full-width-section">
            <div class="section-title">J. CONCLUSIONES</div>
            <div class="section-content">
                En la muestra M-1 (${doc.tipoMuestra || ''}) analizada se obtuvo un resultado <strong> ${valorCualitativo}</strong> para examen cualitativo
                y de alcoholemia<strong> ${valorCuantitativoTexto}</strong> en análisis cuantitativo. La muestra procesada queda en laboratorio en calidad de 
                custodia durante el tiempo establecido por ley (Directiva N° 18-03-27)
            </div>
        </div>
        <div class="full-width-section">
      <div class="dual-box-container" style="display: flex; justify-content: space-between; margin-top: 30px;">
        <!-- Caja izquierda: Anexos -->
        <div style="width: 48%;">
          <h6 class="section-title" style="margin-bottom: 8px; font-weight: bold;">K. ANEXOS</h6>
          <div style="text-align: left;">
            ${anexosHtml}
          </div>
        </div>
        <!-- Caja derecha: Fecha + Firma -->
        <div style="width: 48%; text-align: center;">
          <p style="margin-bottom: 80px; font-size: 12px;">Cusco, ${diaHoy} de ${mesHoy} del ${anioHoy}.</p>
          <img src="${rutaFirma}" alt="Firma del perito" style="width: 200px; height: auto; border: none;">
        </div>
      </div>
    </div>
    <div class="custom-footer">
          Calle Alcides Vigo Hurtado N°-133, distrito de Wánchaq – Cusco. Cel. N°980 121873.<br>
          Email: oficricuscomail.com
        </div>
    </div>

    <style>
      .custom-footer {
        position: absolute;
        bottom: 0 ;
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
      }
    </style>
</body>
</html>
    `);
      printWindow.document.close();
      printWindow.focus();
    }
  }
}