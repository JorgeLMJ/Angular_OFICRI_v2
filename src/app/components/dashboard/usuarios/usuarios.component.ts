import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms'; // 🔑 Para [(ngModel)]
import { Usuario } from '../../../models/usuario.model';
import { UsuarioService } from '../../../services/usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuariosPaginados: Usuario[] = [];

  usuarioForm!: FormGroup;
  usuarioSeleccionado: Usuario | null = null;

  terminoBusqueda: string = '';

  // 📄 Paginación
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  constructor(
    private usuarioService: UsuarioService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.usuarioForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // no obligatorio en edición
      rol: ['', Validators.required]
    });

    this.cargarUsuarios();
  }

  // 🚀 Cargar usuarios
  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.usuariosFiltrados = [...this.usuarios];
        this.actualizarPaginacion();
      },
      error: (err) => console.error('Error al cargar usuarios', err)
    });
  }

  // 🔎 Filtrar usuarios
  filtrarUsuarios(): void {
    const termino = this.terminoBusqueda.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(termino) ||
      usuario.email.toLowerCase().includes(termino) ||
      usuario.rol.toLowerCase().includes(termino)
    );
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  // 📄 Actualizar paginación
  actualizarPaginacion(): void {
    this.totalPaginas = Math.ceil(this.usuariosFiltrados.length / this.registrosPorPagina);
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    this.usuariosPaginados = this.usuariosFiltrados.slice(inicio, fin);
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.actualizarPaginacion();
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
      this.actualizarPaginacion();
    }
  }

  // ======================
  // 🚀 CRUD USUARIOS
  // ======================

  nuevoUsuario(): void {
    this.usuarioSeleccionado = null;
    this.usuarioForm.reset();
    const modal = new (window as any).bootstrap.Modal(document.getElementById('usuarioModal'));
    modal.show();
  }

  editarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.usuarioForm.patchValue({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });
    this.usuarioForm.get('password')?.setValue(''); // limpiar contraseña
    const modal = new (window as any).bootstrap.Modal(document.getElementById('usuarioModal'));
    modal.show();
  }

  guardarUsuario(): void {
    if (this.usuarioForm.valid) {
      const formValue = this.usuarioForm.value;
      const usuario: Usuario = {
        id: this.usuarioSeleccionado?.id,
        nombre: formValue.nombre,
        email: formValue.email,
        password: formValue.password ? formValue.password : undefined, // si está vacío, no actualizar
        rol: formValue.rol
      };

      if (this.usuarioSeleccionado) {
        // 🚀 Modo actualización
        this.usuarioService.actualizarUsuario(usuario.id!, usuario).subscribe({
          next: () => {
            Swal.fire('✏️ Actualizado', 'Usuario actualizado correctamente', 'success');
            this.cargarUsuarios();
            const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
            modal.hide();
          },
          error: () => Swal.fire('❌ Error', 'No se pudo actualizar el usuario porque el', 'error')
        });
      } else {
        // 🚀 Modo creación
        this.usuarioService.crearUsuario(usuario).subscribe({
          next: () => {
            Swal.fire('✅ Creado', 'Usuario creado correctamente', 'success');
            this.cargarUsuarios();
            const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
            modal.hide();
          },
          error: () => Swal.fire('❌ Error', 'No se pudo crear el usuario porque el correo ya fue registrado', 'error')
        });
      }
    }
  }

  eliminarUsuario(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este usuario será eliminado permanentemente',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.usuarioService.eliminarUsuario(id).subscribe({
          next: () => {
            this.usuarios = this.usuarios.filter(u => u.id !== id);
            this.filtrarUsuarios();
            Swal.fire('✅ Eliminado', 'El usuario ha sido eliminado', 'success');
          },
          error: () => Swal.fire('❌ Error', 'No se pudo eliminar el usuario porque esta relacionado con un empleado', 'error')
        });
      }
    });
  }
}
