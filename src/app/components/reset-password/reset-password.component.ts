import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  token: string = '';
  successMessage = '';
  errorMessage = '';

  // 👀 control de visibilidad de contraseñas
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // recuperar token de la URL
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    // construir formulario con validaciones fuertes
    this.resetForm = this.fb.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8), // mínimo 8 caracteres
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/) 
            // al menos una minúscula, una mayúscula, un número y un caracter especial
          ]
        ],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordsMatch }
    );
  }

  // validación personalizada para comparar contraseñas
  passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { passwordMismatch: true };
  }

  // alternar visibilidad de contraseñas
  togglePassword(field: 'new' | 'confirm'): void {
    if (field === 'new') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // envío del formulario
  onSubmit(): void {
    if (this.resetForm.valid && this.token) {
      const payload = {
        token: this.token,
        newPassword: this.resetForm.value.newPassword
      };

      this.authService.resetPassword(payload.token, payload.newPassword).subscribe({
        next: () => {
          this.successMessage = '✅ Contraseña restablecida con éxito';
          this.errorMessage = '';
          setTimeout(() => this.router.navigate(['/login']), 2500); // redirige al login
        },
        error: (err) => {
          this.errorMessage = '❌ Error al restablecer la contraseña';
          this.successMessage = '';
          console.error('❌ Backend respondió:', err);
        }
      });
    } else {
      this.errorMessage = 'El formulario no es válido o el token es incorrecto.';
    }
  }
}
