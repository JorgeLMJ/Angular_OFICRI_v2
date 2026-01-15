// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';
import { NotificationCreateDTO } from '../models/notification-create-dto.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'http://localhost:8080/api/notifications';

  constructor(private http: HttpClient) {}

  create(dto: NotificationCreateDTO): Observable<Notification> {
    return this.http.post<Notification>(this.baseUrl, dto);
  }

  // ✅ Obtiene TODAS las notificaciones (sin filtro)
  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.baseUrl);
  }

  // ✅ Obtiene notificaciones no leídas
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/unread`);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.baseUrl}/${id}/read`, {});
  }

  // ✅ Conteo de no leídas
  countUnreadNotifications(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/unread/count`);
  }
}