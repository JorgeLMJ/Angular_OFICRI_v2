// src/app/components/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';

declare var bootstrap: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule]
})
export class DashboardComponent implements OnInit, OnDestroy {
  isMenuOpen = true;
  isDarkMode = false;
  userName: string = '';
  currentRole: string = '';
  currentPage = 'Panel de Control';

  menuItems = [
    { title: 'Inicio', icon: 'bi-house-door', route: '/dashboard', roles: ['Administrador'] },
    { title: 'Empleados', icon: 'bi-people', route: '/dashboard/empleados', roles: ['Administrador'] },
    { title: 'Documentos', icon: 'bi-file-earmark-text', route: '/dashboard/documento', roles: ['Administrador', 'Auxiliar de Dosaje', 'Auxiliar de Toxicologia'] },
    { title: 'Asignaciones Dosaje', icon: 'bi-journal-text', route: '/dashboard/asignaciones-dosaje', roles: ['Administrador', 'Auxiliar de Dosaje','Quimico Farmaceutico'] },
    { title: 'Oficio Dosaje', icon: 'bi-file-earmark-medical', route: '/dashboard/oficio-dosaje', roles: ['Administrador', 'Auxiliar de Dosaje'] },
    { title: 'Asignaciones Toxicología', icon: 'bi-beaker', route: '/dashboard/asignaciones-toxicologia', roles: ['Administrador', 'Auxiliar de Toxicologia','Quimico Farmaceutico'] },
    { title: 'Usuarios', icon: 'bi-person-gear', route: '/dashboard/usuarios', roles: ['Administrador'] },
    { title: 'Notificaciones', icon: 'bi-bell', route: '/dashboard/notificaciones', roles: ['Administrador', 'Auxiliar de Dosaje', 'Auxiliar de Toxicologia', 'Quimico Farmaceutico'] },
    { title: 'Reportes', icon: 'bi-bar-chart', route: '/dashboard/reportes', roles: ['Administrador', 'Auxiliar de Dosaje', 'Auxiliar de Toxicologia', 'Quimico Farmaceutico'] }
  ];

  filteredMenuItems: any[] = [];
  unreadCount = 0; // 👈 Solo el contador

  private destroy$ = new Subject<void>();
  private refreshInterval: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userName = user?.nombre || 'Usuario';
    this.currentRole = user?.rol || '';

    this.filteredMenuItems = this.menuItems.filter(item =>
      item.roles.includes(this.currentRole)
    );

    this.loadUnreadCount(); // 👈 Carga el contador

    this.refreshInterval = setInterval(() => {
      this.loadUnreadCount();
    }, 30000);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPage = this.getCurrentPageTitle();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private loadUnreadCount(): void {
    this.notificationService.countUnreadNotifications().subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
      error: (err: unknown) => console.error('Error cargando contador de notificaciones', err)
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('bg-dark', this.isDarkMode);
    document.body.classList.toggle('text-white', this.isDarkMode);
  }

  getCurrentPageTitle(): string {
    const currentRoute = this.router.url;
    const menuItem = this.filteredMenuItems.find(item => currentRoute.startsWith(item.route));
    return menuItem ? menuItem.title : 'Panel de Control';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}