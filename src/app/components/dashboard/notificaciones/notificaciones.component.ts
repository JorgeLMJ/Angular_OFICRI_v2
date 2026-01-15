// src/app/components/dashboard/notificaciones/notificaciones.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models/notification.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notificaciones.component.html' 
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.notificationService.getAllNotifications().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        // ✅ Ordenar por fecha descendente (más reciente primero)
        this.notifications = data.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: (updated) => {
          const index = this.notifications.findIndex(n => n.id === updated.id);
          if (index !== -1) {
            this.notifications[index] = updated;
          }
        },
        error: (err) => {
          console.error('Error marcando como leída', err);
        }
      });
    }
  }
}