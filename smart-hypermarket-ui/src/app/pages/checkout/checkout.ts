import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { TranslatePipe } from '../../pipes/translate';
import { Order } from '../../models/hypermarket.models';

type PaymentMethod = 'Cash' | 'Card';
type DeliverySlot = 'express' | 'morning' | 'afternoon' | 'evening';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  protected readonly submitted = signal(false);
  protected readonly placedOrder = signal<Order | null>(null);

  protected customerName = '';
  protected customerEmail = '';
  protected customerPhone = '';
  protected deliveryAddress = '';
  protected deliveryCity = '';
  protected deliverySlot: DeliverySlot = 'morning';
  protected deliveryNotes = '';
  protected paymentMethod: PaymentMethod = 'Cash';
  protected cardNumber = '';

  protected readonly deliverySlotLabels: Record<DeliverySlot, string> = {
    express: 'checkout.slotExpress',
    morning: 'checkout.slotMorning',
    afternoon: 'checkout.slotAfternoon',
    evening: 'checkout.slotEvening',
  };

  protected async placeOrder(form: NgForm): Promise<void> {
    if (form.invalid || this.cart.items().length === 0) {
      this.submitted.set(true);
      return;
    }

    try {
      const order = await this.orderService.createOrder({
        customerName: this.customerName,
        customerEmail: this.customerEmail,
        customerPhone: this.customerPhone,
        deliveryAddress: this.deliveryAddress,
        deliveryCity: this.deliveryCity,
        deliverySlot: this.deliverySlotLabels[this.deliverySlot],
        deliveryNotes: this.deliveryNotes || undefined,
        subtotal: this.cart.subtotal(),
        categoryDiscountTotal: this.cart.categoryDiscountTotal(),
        couponCode: this.cart.appliedCoupon() || undefined,
        couponDiscountTotal: this.cart.couponDiscountTotal(),
        pointsRedeemed: this.cart.redeemedPoints(),
        pointsDiscountTotal: this.cart.pointsDiscountTotal(),
        deliveryFee: this.cart.deliveryFee(),
        grandTotal: this.cart.grandTotal(),
        paymentMethod: this.paymentMethod,
        paymentStatus: this.paymentMethod === 'Cash' ? 'Pending' : 'Paid',
        cardLastFour: this.paymentMethod === 'Card' ? this.cardNumber.slice(-4) : undefined,
      });

      this.placedOrder.set(order);
      await this.cart.fetchCart();

      setTimeout(() => {
        this.router.navigate(['/orders']);
      }, 2500);
    } catch (err) {
      console.error('Failed to place order', err);
    }
  }
}