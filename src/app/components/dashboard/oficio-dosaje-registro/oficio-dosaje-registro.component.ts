// src/app/components/dashboard/oficio-dosaje-registro/oficio-dosaje-registro.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OficioDosaje } from '../../../models/oficio-dosaje.model';
import { OficioDosajeService } from '../../../services/oficio-dosaje.service';
import { Documento } from '../../../models/documento.model';
import { DocumentoService } from '../../../services/documento.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-oficio-dosaje-registro',
  templateUrl: './oficio-dosaje-registro.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule]
})
export class OficioDosajeRegistroComponent implements OnInit {
  oficioForm!: FormGroup;
  editMode = false;
  currentUserRole: string = '';

  documentos: Documento[] = [];
  documentosFiltrados: Documento[] = [];
  terminoBusqueda: string = '';
  documentoSeleccionadoOficio: string = '';
  documentosAsignados: number[] = [];

  // ✅ Para manejar el documento previamente asignado en edición
  documentoIdAnterior: number | null = null;

  esRolLimitado: boolean = false;

  // ✅ Paginación del modal
  currentPageModal = 1;
  pageSizeModal = 3;
  maxVisiblePagesModal = 5;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private oficioDosajeService: OficioDosajeService,
    private documentoService: DocumentoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserRole = user?.rol || '';

    this.esRolLimitado = ['Auxiliar de Toxicologia'].includes(this.currentUserRole);

    this.oficioForm = this.fb.group({
      id: [null],
      nombreOficio: ['', Validators.required],
      dirigido: ['', Validators.required],
      referencia: ['', Validators.required],
      nroInforme: ['', Validators.required],
      tipoMuestra: ['', Validators.required],
      nombreCompleto: ['', Validators.required],
      auxiliar: ['', Validators.required],
      documentoId: [null, Validators.required]
    });

    // ✅ Cargar documentos y FILTRAR por nombreDocumento = "INFORME PERICIAL DE DOSAJE"
    this.documentoService.getDocumentos().subscribe({
      next: (data: Documento[]) => {
        this.documentos = data.filter(doc =>
          doc.nombreDocumento.trim().toUpperCase() === 'INFORME PERICIAL DE DOSAJE'
        );
        this.documentosFiltrados = [...this.documentos];
        this.goToPageModal(1);
      },
      error: (err: any) => console.error('Error cargando documentos', err)
    });

    // ✅ Cargar oficios existentes para marcar documentos ya asignados
    this.oficioDosajeService.listar().subscribe({
      next: (oficios: OficioDosaje[]) => {
        this.documentosAsignados = oficios
          .filter(o => o.documentoId !== null)
          .map(o => o.documentoId!);

        this.filtrarDocumentos();
      },
      error: (err: any) => console.error('Error cargando oficios', err)
    });

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.editMode = true;
        this.oficioDosajeService.obtenerPorId(id).subscribe((oficio: OficioDosaje) => {
          this.documentoIdAnterior = oficio.documentoId; // ✅ Guardar el ID anterior

          this.oficioForm.patchValue({
            id: oficio.id,
            nombreOficio: oficio.nombreOficio,
            dirigido: oficio.dirigido,
            referencia: oficio.referencia,
            nroInforme: oficio.nroInforme,
            tipoMuestra: oficio.tipoMuestra,
            nombreCompleto: oficio.nombreCompleto,
            auxiliar: oficio.auxiliar,
            documentoId: oficio.documentoId
          }, { emitEvent: false });

          if (oficio.documentoId) {
            this.documentoService.getDocumentoById(oficio.documentoId).subscribe({
              next: (doc: Documento) => {
                this.documentoSeleccionadoOficio = doc.nroOficio;
              },
              error: () => {
                this.documentoSeleccionadoOficio = 'No disponible';
              }
            });
          }
        });
      }
    });
  }

  // ✅ Filtro de búsqueda (resetea a página 1)
  filtrarDocumentos(): void {
    const term = this.terminoBusqueda.toLowerCase().trim();
    this.documentosFiltrados = this.documentos.filter(doc =>
      doc.nroOficio.toLowerCase().includes(term) ||
      doc.procedencia.toLowerCase().includes(term) ||
      (doc.nombres + ' ' + doc.apellidos).toLowerCase().includes(term)
    );
    this.goToPageModal(1);
  }

  isDocumentoAsignado(documentoId: number): boolean {
    return this.documentosAsignados.includes(documentoId);
  }

  seleccionarDocumento(documento: Documento): void {
    if (this.esRolLimitado || this.isDocumentoAsignado(documento.id!)) return;

    const nombreCompleto = `${documento.nombres} ${documento.apellidos} (${documento.edad}), identificado con DNI N°.${documento.dni}.`;

    // ✅ Solo actualizar el formulario, NO documentosAsignados
    this.oficioForm.patchValue({
      documentoId: documento.id,
      referencia: documento.nombreOficio,
      nroInforme: documento.nro_registro?.toString() || '',
      nombreCompleto: nombreCompleto
    });

    this.documentoSeleccionadoOficio = documento.nroOficio;
  }

  puedeSeleccionarEntidades(): boolean {
    return !this.esRolLimitado;
  }

  onSubmit(): void {
    if (this.oficioForm.valid) {
      const formValue = this.oficioForm.getRawValue();
      const oficio: OficioDosaje = { ...formValue };

      const req$ = this.editMode && oficio.id
        ? this.oficioDosajeService.actualizar(oficio.id, oficio)
        : this.oficioDosajeService.crear(oficio);

      req$.subscribe({
        next: () => {
          // ✅ 🔥 SOLO AHORA marcamos el documento como asignado (después de guardar)
          if (oficio.documentoId) {
            this.documentosAsignados.push(oficio.documentoId);
          }
          this.router.navigate(['/dashboard/oficio-dosaje']);
        },
        error: (err: any) => {
          console.error('Error guardando oficio', err);
          alert('❌ Error al guardar el oficio.');
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/oficio-dosaje']);
  }

  // ✅ Métodos de paginación del modal
  get totalPagesModal(): number {
    return Math.max(1, Math.ceil(this.documentosFiltrados.length / this.pageSizeModal));
  }

  get paginatedDocumentos(): Documento[] {
    const start = (this.currentPageModal - 1) * this.pageSizeModal;
    return this.documentosFiltrados.slice(start, start + this.pageSizeModal);
  }

  goToPageModal(p: number): void {
    this.currentPageModal = Math.min(Math.max(1, p), this.totalPagesModal);
  }

  nextPageModal(): void {
    if (this.currentPageModal < this.totalPagesModal) {
      this.currentPageModal++;
    }
  }

  prevPageModal(): void {
    if (this.currentPageModal > 1) {
      this.currentPageModal--;
    }
  }

  getPageNumbersModal(): number[] {
    const pages: number[] = [];
    const half = Math.floor(this.maxVisiblePagesModal / 2);
    let start = Math.max(1, this.currentPageModal - half);
    let end = Math.min(this.totalPagesModal, start + this.maxVisiblePagesModal - 1);
    if (end - start + 1 < this.maxVisiblePagesModal) {
      start = Math.max(1, end - this.maxVisiblePagesModal + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}