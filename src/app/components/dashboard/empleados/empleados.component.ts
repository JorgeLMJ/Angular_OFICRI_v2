import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoDTO } from '../../../models/empleado.model';
import { EmpleadoService } from '../../../services/Empleado.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2'; // ✅ Importamos SweetAlert

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleados.component.html'
})
export class EmpleadosComponent implements OnInit {
  empleados: EmpleadoDTO[] = [];
  searchTerm = '';

  // paginación
  currentPage = 1;
  pageSize = 8;

  constructor(
    private empleadoService: EmpleadoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEmpleados();
  }

  // 🚀 Navegar a nuevo empleado
  nuevoEmpleado(): void {
    this.router.navigate(['/dashboard/empleados/empleado-registro']);
  }

  // 🚀 Navegar a editar empleado
  editarEmpleado(id: number): void {
    this.router.navigate(['/dashboard/empleados', id, 'editar']);
  }

  // ======= API =======
  loadEmpleados(): void {
  this.empleadoService.getAll().subscribe({
    next: (data) => {
      // ✅ Convertimos booleanos a strings 'Activo' / 'Inactivo'
      this.empleados = (data ?? []).map(emp => ({
        ...emp,
        estado: typeof emp.estado === 'boolean'
          ? (emp.estado ? 'Activo' : 'Inactivo')  // ✅ true → 'Activo', false → 'Inactivo'
          : emp.estado // si ya es string, lo dejamos
      }));
      this.goToPage(1);
    },
    error: (err: unknown) => console.error('Error cargando empleados', err)
  });
}


  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmpleados.length / this.pageSize));
  }

  get paginatedEmpleados(): EmpleadoDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEmpleados.slice(start, start + this.pageSize);
  }

  goToPage(p: number) {
    this.currentPage = Math.min(Math.max(1, p), this.totalPages);
  }

  nextPage() { this.goToPage(this.currentPage + 1); }
  prevPage() { this.goToPage(this.currentPage - 1); }

  // 🚀 eliminar empleado — ✅ CON SWEETALERT
confirmDelete(emp: EmpleadoDTO): void {
  if (!emp.id) return; // 👈 Ya validas que no sea undefined

  Swal.fire({
    title: '¿Estás seguro?',
    text: `Se eliminará al empleado: ${emp.nombre} ${emp.apellido}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  }).then(result => {
    if (result.isConfirmed) {
      // ✅ Usamos 'emp.id!' porque ya validamos arriba que no es undefined
      this.empleadoService.delete(emp.id!).subscribe({
        next: () => {
          this.loadEmpleados();
          Swal.fire(
            '✅ Eliminado',
            'El empleado ha sido eliminado correctamente.',
            'success'
          );
        },
        error: (err) => {
          console.error('Error eliminando', err);
          Swal.fire(
            '❌ Error',
            'No se pudo eliminar el empleado, porque el empleado tiene trabajos ya realizados',
            'error'
          );
        }
      });
    }
  });
}

  trackById(_: number, item: EmpleadoDTO) {
    return item.id;
  }
  
 // Métod: toggleEstado
toggleEstado(emp: EmpleadoDTO, event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const nuevoEstado = checkbox.checked ? 'Activo' : 'Inactivo';

  this.empleadoService.updateEstado(emp.id!, nuevoEstado).subscribe({
    next: () => {
      // Actualiza localmente
      const empleadoOriginal = this.empleados.find(e => e.id === emp.id);
      if (empleadoOriginal) {
        empleadoOriginal.estado = nuevoEstado;
      }
      Swal.fire('✅ Éxito', `El estado ha sido actualizado a ${nuevoEstado.toLowerCase()}.`, 'success');
    },
    error: (err: unknown) => {
      console.error('Error al actualizar estado', err);
      Swal.fire('❌ Error', 'No se pudo actualizar el estado.', 'error');
    }
  });
}

// Getter: filteredEmpleados
get filteredEmpleados(): EmpleadoDTO[] {
  const q = this.searchTerm.trim().toLowerCase();
  if (!q) return [...this.empleados];
  
  return this.empleados.filter(e => {
    const terminos = [
      e.nombre,
      e.apellido,
      e.dni,
      e.usuarioEmail,
      // ✅ Convertimos a string si es booleano
      typeof e.estado === 'boolean' 
        ? (e.estado ? 'Activo' : 'Inactivo')
        : e.estado
    ]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '');

    return terminos.some(term => term.toLowerCase().includes(q));
  });
}
}