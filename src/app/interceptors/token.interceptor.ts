// src/app/interceptors/token.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;

  // Establecer Content-Type si no está presente
  if (!req.headers.has('Content-Type')) {
    authReq = req.clone({ headers: req.headers.set('Content-Type', 'application/json') });
  }

  // Añadir token si existe
  if (token) {
    authReq = authReq.clone({
      headers: authReq.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq);
};