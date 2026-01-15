import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
  standalone: true, 
  imports: [ReactiveFormsModule,CommonModule] 
})
export class RegistroComponent implements OnInit {
  registroForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['USER', Validators.required] // Valor por defecto
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.registroForm.valid) {
      this.authService.registrar(
        this.registroForm.value.nombre,
        this.registroForm.value.email,
        this.registroForm.value.password,
        this.registroForm.value.rol
      ).subscribe({
        next: () => {
          this.successMessage = 'Registro exitoso. Redirigiendo al login...';
          this.errorMessage = '';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.errorMessage = err.error || 'Error al registrar usuario';
          this.successMessage = '';
        }
      });
    }
  }

  // Getters para acceder fácilmente a los controles del formulario
  get nombre() { return this.registroForm.get('nombre'); }
  get email() { return this.registroForm.get('email'); }
  get password() { return this.registroForm.get('password'); }
  get rol() { return this.registroForm.get('rol'); }
}