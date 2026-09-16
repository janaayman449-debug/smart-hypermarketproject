import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-quick-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './quick-cart.html',
  styleUrl: './quick-cart.css'
})
export class QuickCart {
  cartService = inject(CartService);
  router = inject(Router);

  couponInput = '';
  couponFeedback = '';
  isError = false;

  applyCoupon() {
    if (!this.couponInput) return;
    const res = this.cartService.applyCoupon(this.couponInput);
    this.couponFeedback = res.message;
    this.isError = !res.success;
  }

  removeCoupon() {
    this.cartService.removeCoupon();
    this.couponInput = '';
    this.couponFeedback = '';
  }

  goToCheckout() {
    this.cartService.closeDrawer();
    this.router.navigate(['/cart']);
  }
}
