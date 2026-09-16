﻿import { Component, signal, computed, input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Order } from '../../models/hypermarket.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './orders.html',
  styleUrls: ['./orders.css']
})
export class Orders implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  readonly embedded = input<boolean>(false);

  readonly activeTab = signal<string>('all');
  readonly expandedOrderId = signal<string | null>(null);

  private readonly userOrders = computed<Order[]>(() => this.orderService.orders());

  ngOnInit(): void {
    this.orderService.refreshOrders();
  }

  get filteredOrders(): Order[] {
    const tab = this.activeTab();
    const all = this.userOrders();
    if (tab === 'all') return all;
    return all.filter((o) => o.orderStatus === tab);
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  toggleExpand(orderId: string): void {
    this.expandedOrderId.update((id) => (id === orderId ? null : orderId));
  }

  formatDate(dateInput: string): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isEligibleForReturn(order: Order): boolean {
    return this.orderService.isReturnEligible(order);
  }
}