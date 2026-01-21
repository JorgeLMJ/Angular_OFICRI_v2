import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auditoria } from '../../../models/auditoria.model';
import { AuditoriaService } from '../../../services/auditoria.service';

@Component({
  selector: 'app-auditoria',
  templateUrl: './auditoria.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class AuditoriaComponent implements OnInit {
  auditorias: Auditoria[] = [];
  loading = true;

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.auditoriaService.getAll().subscribe({
      next: (data) => {
        this.auditorias = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  verDetalles(json: string): void {
    try {
      const parsed = JSON.parse(json);
      alert(JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert(json);
    }
  }
}