// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface LoginResponse {
  token: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  empleadoId: number | null;
}

export interface AuthUser {
  token: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  empleadoId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly baseUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      map(response => {
        this.saveUserToStorage(response);
        return response;
      }),
      catchError(this.handleError)
    );
  }

  registrar(nombre: string, email: string, password: string, rol: string): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/registro`, {
      nombre,
      email,
      password,
      rol
    }).pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userApellido');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRol');
    localStorage.removeItem('empleadoId');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getEmpleadoId(): number | null {
    const id = localStorage.getItem('empleadoId');
    return id && id !== 'null' ? +id : null;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  private saveUserToStorage(response: LoginResponse): void {
    const { token, nombre, apellido, email, rol, empleadoId } = response;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', nombre);
    localStorage.setItem('userApellido', apellido);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userRol', rol);
    localStorage.setItem('empleadoId', empleadoId?.toString() ?? 'null');

    const user: AuthUser = { token, nombre, apellido, email, rol, empleadoId };
    this.currentUserSubject.next(user);
  }

  private loadUserFromStorage(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired(token)) {
      const user: AuthUser = {
        token,
        nombre: localStorage.getItem('userName') || '',
        apellido: localStorage.getItem('userApellido') || '',
        email: localStorage.getItem('userEmail') || '',
        rol: localStorage.getItem('userRol') || '',
        empleadoId: this.getEmpleadoId()
      };
      this.currentUserSubject.next(user);
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      const exp = payload.exp;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }

  // ✅ MANEJO MEJORADO DE ERRORES
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido al iniciar sesión';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else if (error.status === 403) {
      // ✅ CUENTA INACTIVA
      errorMessage = 'Tu cuenta está inactiva. Contacta al administrador.';
    } else if (error.status === 401) {
      // Credenciales incorrectas
      errorMessage = 'Usuario o contraseña incorrectos.';
    } else if (error.status === 0) {
      // Sin conexión al backend
      errorMessage = 'No se puede conectar al servidor. Verifica tu conexión.';
    } else {
      // Otros errores
      errorMessage = error.error?.message || `Error ${error.status}: ${error.message}`;
    }

    console.error('❌ AuthService error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email }).pipe(
      catchError(this.handleError)
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, { token, newPassword }).pipe(
      catchError(this.handleError)
    );
  }
}