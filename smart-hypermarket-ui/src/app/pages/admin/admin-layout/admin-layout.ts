import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { MessagesService } from '../../../services/messages.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationCenter } from '../../../components/notification-center/notification-center';
import { TranslatePipe } from '../../../pipes/translate';

interface AdminNavItem {
  route: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, NotificationCenter],
  templateUrl: './admin-layout.html',
  styleUrl: '../admin.css',
})
export class AdminLayout implements OnInit {
  protected readonly orderService = inject(OrderService);
  protected readonly messagesService = inject(MessagesService);
  protected readonly authService = inject(AuthService);

  /** Mobile sidebar open/close state */
  protected readonly sidebarOpen = signal(false);

  protected readonly navItems: AdminNavItem[] = [
    { route: 'analytics', icon: 'fa-chart-line', label: 'admin.analytics' },
    { route: 'products', icon: 'fa-boxes-stacked', label: 'admin.products' },
    { route: 'orders', icon: 'fa-receipt', label: 'admin.orders' },
    { route: 'payments', icon: 'fa-money-bill-transfer', label: 'admin.payments' },
    { route: 'offers', icon: 'fa-tags', label: 'admin.offers' },
    { route: 'customers', icon: 'fa-users', label: 'admin.customers' },
    { route: 'messages', icon: 'fa-envelope', label: 'admin.messages' },
    { route: 'returns', icon: 'fa-rotate-left', label: 'admin.returns' },
  ];

  protected readonly unreadMessagesCount = computed(() => this.messagesService.unreadCount());
  protected readonly pendingReturnsCount = computed(() =>
    this.orderService.returns().filter((r) => r.status === 'Pending').length
  );

  /**
   * Transfers waiting for a decision. Derived from the already-loaded orders
   * rather than a second endpoint, so the badge costs nothing extra.
   */
  protected readonly pendingPaymentsCount = computed(() =>
    this.orderService.orders().filter((o) => o.paymentStatus === 'ProofSubmitted').length
  );

  protected readonly adminName = computed(() => this.authService.currentUser()?.name ?? 'Admin');
  protected readonly adminInitial = computed(() => this.adminName().trim().charAt(0).toUpperCase() || 'A');

  ngOnInit(): void {
    this.messagesService.loadMessages();
  }

  protected badgeFor(route: string): number {
    if (route === 'messages') return this.unreadMessagesCount();
    if (route === 'returns') return this.pendingReturnsCount();
    if (route === 'payments') return this.pendingPaymentsCount();
    return 0;
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}