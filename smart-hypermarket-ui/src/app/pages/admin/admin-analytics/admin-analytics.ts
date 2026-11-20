import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../services/product.service';
import { OrderService } from '../../../services/order.service';
import { TranslatePipe } from '../../../pipes/translate';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './admin-analytics.html',
  styleUrl: '../admin.css',
})
export class AdminAnalytics {
  protected readonly productService = inject(ProductService);
  protected readonly orderService = inject(OrderService);

  totalRevenue = computed(() => this.orderService.orders().reduce((sum, o) => sum + o.grandTotal, 0));
  lowStockCount = computed(() => this.productService.products().filter((p) => p.stock <= 10).length);

  avgOrderValue = computed(() => {
    const orders = this.orderService.orders();
    if (orders.length === 0) return 0;
    return Math.round(this.totalRevenue() / orders.length);
  });

  pendingReturnsCount = computed(() =>
    this.orderService.returns().filter((r) => r.status === 'Pending').length
  );

  /** Products grouped by category, sorted, for the breakdown chart */
  categoryBreakdown = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.productService.products()) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    rows.sort((a, b) => b.count - a.count);
    const max = rows.length ? rows[0].count : 1;
    return rows.slice(0, 6).map((r) => ({ ...r, percent: Math.round((r.count / max) * 100) }));
  });

  /** Last 5 orders, most recent first */
  recentOrders = computed(() =>
    [...this.orderService.orders()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );
}