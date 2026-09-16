import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/hypermarket.models';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-returns',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './returns.html',
  styleUrl: './returns.css',
})
export class Returns implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);

  protected readonly selectedOrderId = signal<string | null>(null);
  protected selectedQuantities: Record<string, number> = {};
  protected reason = '';
  protected readonly submitted = signal(false);
  protected readonly successMessage = signal(false);

  ngOnInit(): void {
    this.orderService.refreshOrders();
    this.orderService.refreshReturns();

    const preselect = this.route.snapshot.queryParamMap.get('orderId');
    if (preselect) this.selectOrder(preselect);
  }

  protected get eligibleOrders(): Order[] {
    return this.orderService.orders().filter((o) => this.orderService.isReturnEligible(o));
  }

  protected get selectedOrder(): Order | undefined {
    const id = this.selectedOrderId();
    return id ? this.orderService.getOrderById(id) : undefined;
  }

  protected get myReturns() {
    return this.orderService.returns();
  }

  protected selectOrder(orderId: string): void {
    this.selectedOrderId.set(orderId);
    this.selectedQuantities = {};
    const order = this.orderService.getOrderById(orderId);
    order?.items.forEach((item) => (this.selectedQuantities[item.product.id] = 0));
  }

  protected qtyFor(productId: string): number {
    return this.selectedQuantities[productId] || 0;
  }

  protected incQty(productId: string, max: number): void {
    this.selectedQuantities[productId] = Math.min(max, this.qtyFor(productId) + 1);
  }

  protected decQty(productId: string): void {
    this.selectedQuantities[productId] = Math.max(0, this.qtyFor(productId) - 1);
  }

  protected get refundEstimate(): number {
    const order = this.selectedOrder;
    if (!order) return 0;
    return order.items.reduce((sum, item) => {
      const qty = this.qtyFor(item.product.id);
      const unitPrice = item.finalPrice / item.quantity;
      return sum + qty * unitPrice;
    }, 0);
  }

  protected get hasSelectedItems(): boolean {
    return Object.values(this.selectedQuantities).some((q) => q > 0);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  protected async submitReturn(): Promise<void> {
    this.submitted.set(true);
    const order = this.selectedOrder;
    if (!order || !this.hasSelectedItems || !this.reason) return;

    const returnedItems = order.items.filter((item) => this.qtyFor(item.product.id) > 0);

    for (const item of returnedItems) {
      const unitPrice = item.finalPrice / item.quantity;
      await this.orderService.createReturnRequest({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        productName: item.product.name,
        reason: this.reason,
        refundAmount: Math.round(unitPrice * this.qtyFor(item.product.id)),
      });
    }

    this.successMessage.set(true);
    this.selectedOrderId.set(null);
    this.selectedQuantities = {};
    this.reason = '';
    this.submitted.set(false);
  }
}