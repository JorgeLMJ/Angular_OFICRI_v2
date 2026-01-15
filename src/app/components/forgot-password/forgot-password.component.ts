import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';   // 👈 importamos RouterModule
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  standalone: true, 
  imports: [ReactiveFormsModule, CommonModule, RouterModule] // 👈 agregamos RouterModule
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.forgotForm.valid) {
      this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
        next: () => {
          this.successMessage = 'Se ha enviado un enlace de recuperación a tu email';
          this.errorMessage = '';
          setTimeout(() => {
            this.router.navigate(['/login']); 
          }, 60000);
        },
        error: (err) => {
          this.errorMessage = 'Error al enviar el email de recuperación';
          this.successMessage = '';
          console.error(err);
        }
      });
    }
  }
}
