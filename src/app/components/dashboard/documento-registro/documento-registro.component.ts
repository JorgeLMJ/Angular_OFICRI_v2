// src/app/components/dashboard/documento-registro/documento-registro.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Documento } from '../../../models/documento.model';
import { DocumentoService } from '../../../services/documento.service';
import Swal from 'sweetalert2';
import { GeminiOcrService, OCRResult } from '../../../services/gemini-ocr.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-documento-registro',
  templateUrl: './documento-registro.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class DocumentoRegistroComponent implements OnInit {
  documentoForm!: FormGroup;
  isEditMode = false;
  currentDocId: number | null = null;
  currentUserRole: string = '';
  isAdmin = false;
  nombreDocumentoReadOnly = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private documentoService: DocumentoService,
    private geminiOcr: GeminiOcrService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserRole = currentUser?.rol || '';
    this.isAdmin = this.currentUserRole === 'Administrador';

    this.initializeForm();

    if (!this.isEditMode) {
      this.setNombreDocumentoByRole();
    }

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.currentDocId = +id;
        this.loadDocumentForEdit(this.currentDocId);
      }
    });
  }

  initializeForm(): void {
    this.documentoForm = this.fb.group({
      id: [null],
      nombreDocumento: ['', Validators.required],
      nro_registro: ['', [Validators.required]],
      fechaIngreso: ['', Validators.required],
      nroOficio: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      nombreOficio: ['', Validators.required],
      asunto: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      edad: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      dni: ['', [Validators.required, Validators.pattern(/^(?:\d{8}|\d{12})$/)]],
      situacion: ['', Validators.required],
      delitoInfraccion: ['', Validators.required],
      fechaHoraIncidente: ['', Validators.required],
      procedencia: ['', Validators.required],
      fechaActa: [''],
      horaTomaMuestra: [''],
      tipoMuestra: [''],
      personaQueConduce: [''],
      cualitativo: [''],
      empleadoId: [null],
      anexos: this.fb.group({
        cadenaCustodia: [false],
        rotulo: [false],
        actaTomaMuestra: [false],
        actaConsentimiento: [false],
        actaDenunciaVerbal: [false],
        actaIntervencionPolicial: [false],
        copiaDniSidpol: [false],
        actaObtencionMuestra: [false]
      })
    });
  }

  private setNombreDocumentoByRole(): void {
    let nombreDoc = '';
    if (this.currentUserRole === 'Auxiliar de Dosaje') {
      nombreDoc = 'INFORME PERICIAL DE DOSAJE';
    } else if (this.currentUserRole === 'Auxiliar de Toxicologia') {
      nombreDoc = 'INFORME PERICIAL DE TOXICOLOGIA';
    }

    if (nombreDoc) {
      this.documentoForm.patchValue({ nombreDocumento: nombreDoc });
      this.nombreDocumentoReadOnly = true;
    }
  }

  loadDocumentForEdit(id: number): void {
    this.documentoService.getDocumentoById(id).subscribe({
      next: (doc: Documento) => {
        this.documentoForm.patchValue({
          ...doc,
          fechaHoraIncidente: this.combineDateTime(doc.fechaIncidente, doc.horaIncidente),
          anexos: doc.anexos || {}
        });
        this.nombreDocumentoReadOnly = !this.isAdmin;
      },
      error: (err) => {
        console.error("Error al cargar el documento", err);
        Swal.fire('Error', 'No se pudo cargar el documento.', 'error')
          .then(() => this.router.navigate(['/dashboard/documento']));
      }
    });
  }

  private combineDateTime(fecha: string, hora: string): string {
    if (!fecha || !hora) return '';
    const horaFormateada = hora.length === 5 ? hora : hora.substring(0, 5);
    return `${fecha}T${horaFormateada}`;
  }

  private splitDateTime(fechaHora: string): { fecha: string; hora: string } {
    if (!fechaHora) return { fecha: '', hora: '' };
    const [fecha, hora] = fechaHora.split('T');
    return { 
      fecha: fecha || '', 
      hora: hora ? hora.substring(0, 5) : '' 
    };
  }

  onSubmit(): void {
    if (!this.documentoForm.valid) {
      this.documentoForm.markAllAsTouched();
      Swal.fire('Formulario Inválido', 'Completa los campos requeridos.', 'error');
      return;
    }

    const formValue = this.documentoForm.getRawValue();
    const { fecha: fechaIncidente, hora: horaIncidente } = this.splitDateTime(formValue.fechaHoraIncidente);
    
    // ✅ Asignar el empleadoId del usuario actual si es nuevo documento
    const currentUser = this.authService.getCurrentUser();
    let empleadoId = formValue.empleadoId;
    if (!this.isEditMode && currentUser?.empleadoId) {
      empleadoId = currentUser.empleadoId;
    }

    const documentoPayload: Documento = {
      ...formValue,
      fechaIncidente,
      horaIncidente,
      empleadoId
    };
    delete (documentoPayload as any).fechaHoraIncidente;

    if (this.isEditMode && this.currentDocId) {
      documentoPayload.id = this.currentDocId;
      this.documentoService.updateDocumento(this.currentDocId, documentoPayload).subscribe({
        next: () => {
          Swal.fire('¡Actualizado!', 'Documento actualizado.', 'success');
          this.router.navigate(['/dashboard/documento']);
        },
        error: (err) => {
          console.error('Error al actualizar', err);
          Swal.fire('Error', 'No se pudo actualizar.', 'error');
        }
      });
    } else {
      delete documentoPayload.id;
      this.documentoService.createDocumento(documentoPayload).subscribe({
        next: () => {
          Swal.fire('¡Guardado!', 'Documento creado correctamente.', 'success');
          this.router.navigate(['/dashboard/documento']);
        },
        error: (err) => {
          console.error('Error al crear', err);
          Swal.fire('Error', 'No se pudo crear.', 'error');
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/documento']);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      Swal.fire('Error', 'Solo PDF, PNG o JPG.', 'error');
      return;
    }

    Swal.fire({
      title: 'Procesando...',
      text: 'Extrayendo datos...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const textoCrudo = await this.geminiOcr.extractTextFromFiles([file]);
      const data = await this.geminiOcr.extractStructuredData(textoCrudo);
      Swal.close();
      this.fillFormFromOCR(data);
    } catch (error) {
      Swal.close();
      console.error('Error en OCR', error);
      Swal.fire('Error', 'No se pudieron extraer los datos.', 'error');
    }
  }
 
  private fillFormFromOCR(data: OCRResult): void {
    this.documentoForm.patchValue({
      nro_registro: '',
      nroOficio: this.cleanNumber(data.nro_oficio) || '',
      nombreOficio: data.nombre_oficio || '',
      asunto: data.asunto || '',
      nombres: data.nombres || '',
      apellidos: data.apellidos || '',
      edad: this.cleanNumber(data.edad) || '',
      dni: data.dni_ce || '',
      situacion: data.situacion || '',
      delitoInfraccion: data.delito_infraccion || '',
      procedencia: data.procedencia || ''
    });

    let fechaHora = '';
    if (data.fecha_incidente && data.hora_incidente) {
      const fechaISO = this.parseDateToISO(data.fecha_incidente);
      fechaHora = `${fechaISO}T${data.hora_incidente}`;
    }
    this.documentoForm.patchValue({ fechaHoraIncidente: fechaHora });

    const hoy = new Date().toISOString().split('T')[0];
    this.documentoForm.patchValue({ fechaIngreso: hoy });

    if (!this.isEditMode) {
      this.setNombreDocumentoByRole();
    }
  }

  private cleanNumber(value: string): string {
    return value ? value.replace(/\D/g, '') : '';
  }

  private parseDateToISO(dateStr: string): string {
    if (!dateStr) return '';
    const months = {
      'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SET': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    };
    const match = dateStr.match(/(\d{1,2})([A-Z]{3})(\d{4})/i);
    if (match) {
      const [, day, monthAbbr, year] = match;
      const month = months[monthAbbr.toUpperCase() as keyof typeof months] || '01';
      const paddedDay = day.padStart(2, '0');
      return `${year}-${month}-${paddedDay}`;
    }
    return '';
  }
}