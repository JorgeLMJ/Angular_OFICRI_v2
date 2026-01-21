import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RegistroComponent } from './components/registro/registro.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { HomeComponent } from './components/dashboard/home/home.component';
import { EmpleadosComponent } from './components/dashboard/empleados/empleados.component';
import { EmpleadoRegistroComponent } from './components/dashboard/empleado-registro/empleado-registro.component';
import { UsuariosComponent } from './components/dashboard/usuarios/usuarios.component'; 
import { DocumentoComponent } from './components/dashboard/documento/documento.component';
import { DocumentoRegistroComponent } from './components/dashboard/documento-registro/documento-registro.component';
import { AsignacionesDosajeComponent } from './components/dashboard/asignaciones-dosaje/asignaciones-dosaje.component';
import { AsignacionDosajeRegistroComponent } from './components/dashboard/asignacion-dosaje-registro/asignacion-dosaje-registro.component';
import { AsignacionesToxicologiaComponent } from './components/dashboard/asignaciones-toxicologia/asignaciones-toxicologia.component';
import { AsignacionToxicologiaRegistroComponent } from './components/dashboard/asignacion-toxicologia-registro/asignacion-toxicologia-registro.component';
import { OficioDosajeComponent } from './components/dashboard/oficio-dosaje/oficio-dosaje.component';
import { OficioDosajeRegistroComponent } from './components/dashboard/oficio-dosaje-registro/oficio-dosaje-registro.component';
import { ReportesComponent } from './components/dashboard/reportes/reportes.component';
import { AuditoriaComponent } from './components/dashboard/auditoria/auditoria.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard],
    children: [
      { path: '', component: HomeComponent },
      { path: 'usuarios', component: UsuariosComponent },  
      { path: 'empleados', component: EmpleadosComponent },
      { path: 'empleados/empleado-registro', component: EmpleadoRegistroComponent },
      { path: 'empleados/:id/editar', component: EmpleadoRegistroComponent },
      { path: 'documento', component: DocumentoComponent },
      { path: 'documento-registro', component: DocumentoRegistroComponent },
      { path: 'documento/:id/editar', component: DocumentoRegistroComponent },
      { path: 'asignaciones-dosaje', component: AsignacionesDosajeComponent },
      { path: 'asignacion-dosaje-registro', component: AsignacionDosajeRegistroComponent },
      { path: 'asignacion-dosaje-registro/:id', component: AsignacionDosajeRegistroComponent },
      { path: 'asignaciones-toxicologia', component: AsignacionesToxicologiaComponent },
      { path: 'asignacion-toxicologia-registro', component: AsignacionToxicologiaRegistroComponent },
      { path: 'asignacion-toxicologia-registro/:id', component: AsignacionToxicologiaRegistroComponent },
      { path: 'oficio-dosaje', component: OficioDosajeComponent },
      { path: 'oficio-dosaje-registro', component: OficioDosajeRegistroComponent },
      { path: 'oficio-dosaje-registro/:id', component: OficioDosajeRegistroComponent },
      { path: 'reportes', component: ReportesComponent },
      { 
        path: 'notificaciones', 
        loadComponent: () => import('./components/dashboard/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent) 
      },
    { 
      path: 'auditoria', 
      loadComponent: () => import('./components/dashboard/auditoria/auditoria.component').then(m => m.AuditoriaComponent) 
    }
    ]
  },
  { path: '**', redirectTo: '/login' }
];