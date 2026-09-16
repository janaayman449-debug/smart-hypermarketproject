import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { TranslatePipe } from '../../../pipes/translate';

type OrderStatusFilter = 'All' | 'Placed' | 'OutForDelivery' | 'Delivered' | 'Cancelled';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-orders.html',
  styleUrl: '../admin.css',
})
export class AdminOrders {
  orderService = inject(OrderService);

  orderStatusFilter = signal<OrderStatusFilter>('All');

  filteredOrders = computed(() => {
    const filter = this.orderStatusFilter();
    const list = this.orderService.orders();
    return filter === 'All' ? list : list.filter((o) => o.orderStatus === filter);
  });

  setOrderFilter(status: OrderStatusFilter): void {
    this.orderStatusFilter.set(status);
  }

  async changeOrderStatus(
    orderId: string,
    status: 'Placed' | 'OutForDelivery' | 'Delivered' | 'Cancelled'
  ): Promise<void> {
    await this.orderService.updateOrderStatus(orderId, status);
  }
}