import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, AdminUserSummary } from '../../../services/auth.service';
import { TranslatePipe } from '../../../pipes/translate';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './admin-customers.html',
  styleUrl: '../admin.css',
})
export class AdminCustomers implements OnInit {
  private readonly authService = inject(AuthService);

  customers = signal<AdminUserSummary[]>([]);

  ngOnInit(): void {
    this.loadCustomers();
  }

  async loadCustomers(): Promise<void> {
    const users = await this.authService.getAllUsers();
    this.customers.set(users);
  }
}