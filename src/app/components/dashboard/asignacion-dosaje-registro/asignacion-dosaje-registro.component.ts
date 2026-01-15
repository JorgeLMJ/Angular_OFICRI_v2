// src/app/components/dashboard/asignacion-dosaje-registro/asignacion-dosaje-registro.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsignacionDosaje } from '../../../models/dosaje.model';
import { DosajeService } from '../../../services/dosaje.service';
import { Documento } from '../../../models/documento.model';
import { DocumentoService } from '../../../services/documento.service';
import { EmpleadoDTO } from '../../../models/empleado.model';
import { EmpleadoService } from '../../../services/Empleado.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-asignacion-dosaje-registro',
  templateUrl: './asignacion-dosaje-registro.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule]
})
export class AsignacionDosajeRegistroComponent implements OnInit {
  asignacionForm!: FormGroup;
  editMode = false;
  currentUserRole: string = '';

  documentos: Documento[] = [];
  documentosFiltrados: Documento[] = [];
  terminoBusqueda: string = '';
  documentoSeleccionadoOficio: string = '';
  documentosAsignados: number[] = [];

  empleados: EmpleadoDTO[] = [];
  empleadosFiltrados: EmpleadoDTO[] = [];
  terminoBusquedaEmpleado: string = '';
  empleadoSeleccionadoNombre: string = '';

  esRolLimitado: boolean = false;
  puedeEditarEstado: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dosajeService: DosajeService,
    private documentoService: DocumentoService,
    private empleadoService: EmpleadoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserRole = user?.rol || '';

    this.esRolLimitado = ['Auxiliar de Toxicologia'].includes(this.currentUserRole);
    this.puedeEditarEstado = ['Administrador', 'Auxiliar de Dosaje', 'Quimico Farmaceutico'].includes(this.currentUserRole);

    this.asignacionForm = this.fb.group({
      id: [null],
      area: ['Laboratorio de Dosaje'],
      cualitativo: [''],
      estado: ['', Validators.required],
      documentoId: [null, Validators.required],
      empleadoId: [null, Validators.required]
    });

    this.documentoService.getDocumentos().subscribe({
      next: (data: Documento[]) => {
        this.documentos = data.filter(doc =>
          (doc.nombreDocumento || '').toLowerCase().includes('informe pericial de dosaje')
        );
        this.documentosFiltrados = [...this.documentos];
      },
      error: (err: any) => console.error('Error cargando documentos', err)
    });

    this.empleadoService.getAll().subscribe({
      next: (data: EmpleadoDTO[]) => {
        this.empleados = data.filter(emp =>
          emp.cargo.toLowerCase().includes('químico farmacéutico') ||
          emp.cargo.toLowerCase().includes('quimico farmaceutico')
        );
        this.empleadosFiltrados = [...this.empleados];
      },
      error: (err: any) => console.error('Error cargando empleados', err)
    });

    this.dosajeService.listar().subscribe({
      next: (asignaciones: AsignacionDosaje[]) => {
        this.documentosAsignados = asignaciones
          .filter(a => a.documentoId !== null)
          .map(a => a.documentoId!);

        if (this.editMode) {
          const currentDocId = this.asignacionForm.get('documentoId')?.value;
          if (currentDocId) {
            this.documentosAsignados = this.documentosAsignados.filter(id => id !== currentDocId);
          }
        }
        this.filtrarDocumentos();
      },
      error: (err: any) => console.error('Error cargando asignaciones', err)
    });

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.editMode = true;
        this.dosajeService.obtenerPorId(id).subscribe((asignacion: AsignacionDosaje) => {
          this.asignacionForm.patchValue({
            id: asignacion.id,
            area: asignacion.area,
            cualitativo: asignacion.cualitativo,
            estado: asignacion.estado,
            documentoId: asignacion.documentoId,
            empleadoId: asignacion.empleadoId
          }, { emitEvent: false });

          if (asignacion.documentoId) {
            this.documentoService.getDocumentoById(asignacion.documentoId).subscribe({
              next: (doc: Documento) => {
                this.documentoSeleccionadoOficio = doc.nroOficio;
              },
              error: () => {
                this.documentoSeleccionadoOficio = 'No disponible';
              }
            });
          }

          if (asignacion.empleadoId) {
            this.empleadoService.getById(asignacion.empleadoId).subscribe({
              next: (emp: EmpleadoDTO) => {
                this.empleadoSeleccionadoNombre = `${emp.nombre} ${emp.apellido}`;
              },
              error: () => {
                this.empleadoSeleccionadoNombre = 'No disponible';
              }
            });
          }
        });
      }
    });
  }

  filtrarDocumentos(): void {
    const term = this.terminoBusqueda.toLowerCase().trim();
    this.documentosFiltrados = this.documentos.filter(doc =>
      doc.nroOficio.toLowerCase().includes(term) ||
      doc.nombreDocumento.toLowerCase().includes(term) ||
      doc.procedencia.toLowerCase().includes(term) ||
      (doc.nombres + ' ' + doc.apellidos).toLowerCase().includes(term)
    );
  }

  isDocumentoAsignado(documentoId: number): boolean {
    return this.documentosAsignados.includes(documentoId);
  }

  seleccionarDocumento(documento: Documento): void {
    if (this.esRolLimitado || this.isDocumentoAsignado(documento.id!)) return;
    this.asignacionForm.patchValue({ documentoId: documento.id });
    this.documentoSeleccionadoOficio = documento.nroOficio;
  }

  filtrarEmpleados(): void {
    const term = this.terminoBusquedaEmpleado.toLowerCase().trim();
    this.empleadosFiltrados = this.empleados.filter(emp =>
      emp.nombre.toLowerCase().includes(term) ||
      emp.apellido.toLowerCase().includes(term) ||
      emp.dni.includes(term)
    );
  }

  seleccionarEmpleado(empleado: EmpleadoDTO): void {
    if (this.esRolLimitado) return;
    this.asignacionForm.patchValue({ empleadoId: empleado.id });
    this.empleadoSeleccionadoNombre = `${empleado.nombre} ${empleado.apellido}`;
  }

  puedeEditarResultadoCuantitativo(): boolean {
    return ['Quimico Farmaceutico', 'Auxiliar de Toxicologia', 'Administrador'].includes(this.currentUserRole);
  }

  puedeEditarEstadoCampo(): boolean {
    return this.puedeEditarEstado;
  }

  puedeSeleccionarEntidades(): boolean {
    return !this.esRolLimitado;
  }

  onSubmit(): void {
    if (this.asignacionForm.valid) {
      const formValue = this.asignacionForm.getRawValue();
      
      // ✅ Añadir el emisorId (usuario actual) al payload
      const currentUser = this.authService.getCurrentUser();
      const dto = {
        ...formValue,
        emisorId: currentUser?.empleadoId
      };

      const req$ = this.editMode && dto.id
        ? this.dosajeService.actualizar(dto.id, dto)
        : this.dosajeService.crear(dto);

      req$.subscribe({
        next: (savedAsignacion) => {
          // ✅ ELIMINADO: No enviar notificación desde Angular
          // La notificación la genera el backend si estado = "COMPLETADO"
          this.router.navigate(['/dashboard/asignaciones-dosaje']);
        },
        error: (err: any) => {
          console.error('Error guardando asignación', err);
          alert('❌ Error al guardar la asignación.');
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/asignaciones-dosaje']);
  }
}