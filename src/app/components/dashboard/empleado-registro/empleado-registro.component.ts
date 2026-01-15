import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmpleadoService } from '../../../services/Empleado.service';
import { EmpleadoDTO } from '../../../models/empleado.model';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-empleado-registro',
  templateUrl: './empleado-registro.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule]
})
export class EmpleadoRegistroComponent implements OnInit {
  empleadoForm!: FormGroup;
  editMode = false;

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  terminoBusqueda: string = '';

  usuariosAsignados: number[] = [];
  currentRole: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private empleadoService: EmpleadoService,
    private usuarioService: UsuarioService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentRole = user?.rol || '';

    this.empleadoForm = this.fb.group({
      id: [null],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      telefono: [''],
      cargo: ['', Validators.required],
      estado: ['ACTIVO'], // ✅ Valor por defecto: ACTIVO
      usuarioId: [null, Validators.required],
      usuarioEmail: ['']
    });

    // Cargar empleados existentes
    this.empleadoService.getAll().subscribe({
      next: (empleados: EmpleadoDTO[]) => {
        this.usuariosAsignados = empleados
          .filter(emp => emp.usuarioId !== null && emp.usuarioId !== undefined)
          .map(emp => emp.usuarioId!);

        const currentUserId = this.empleadoForm.get('usuarioId')?.value;
        if (this.editMode && currentUserId) {
          this.usuariosAsignados = this.usuariosAsignados.filter(id => id !== currentUserId);
        }

        this.filtrarUsuarios();
      },
      error: (err: any) => console.error('Error cargando empleados', err)
    });

    // Cargar usuarios
    this.usuarioService.getAll().subscribe({
      next: (data: Usuario[]) => {
        this.usuarios = data;
        this.filtrarUsuarios();
      },
      error: (err: any) => console.error('Error cargando usuarios', err)
    });

    // Modo edición
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.editMode = true;
        this.empleadoService.getById(id).subscribe((emp: EmpleadoDTO) => {
          // ✅ Aseguramos que el estado sea string ('ACTIVO' o 'INACTIVO')
          const estado = emp.estado || 'ACTIVO';
          this.empleadoForm.patchValue({
            ...emp,
            estado: estado // Esto activará/desactivará el switch
          });

          if (emp.usuarioId) {
            this.usuarioService.getById(emp.usuarioId).subscribe({
              next: (usuario: Usuario) => {
                this.empleadoForm.get('cargo')?.setValue(usuario.rol);
              },
              error: () => {
                this.empleadoForm.get('cargo')?.setValue('');
              }
            });
          }
        });
      }
    });
  }

  // 🔎 Filtrar usuarios
  filtrarUsuarios(): void {
    const term = this.terminoBusqueda.toLowerCase().trim();
    
    this.usuariosFiltrados = this.usuarios.filter(u =>
      !this.usuariosAsignados.includes(u.id!) &&
      (
        u.nombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      )
    );
  }

  // 🔹 Seleccionar usuario
  seleccionarUsuario(usuario: Usuario): void {
    this.empleadoForm.patchValue({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      cargo: usuario.rol
    });
  }

  onSubmit(): void {
    if (this.empleadoForm.valid) {
      const empleado: EmpleadoDTO = this.empleadoForm.value;
      const req$ = this.editMode
        ? this.empleadoService.update(empleado.id!, empleado)
        : this.empleadoService.create(empleado);

      req$.subscribe({
        next: () => this.router.navigate(['/dashboard/empleados']),
        error: (err: any) => console.error('Error guardando empleado', err)
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/empleados']);
  }
}