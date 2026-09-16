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
}