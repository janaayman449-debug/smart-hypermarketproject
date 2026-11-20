import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-quick-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './quick-cart.html',
  styleUrl: './quick-cart.css'
})
export class QuickCart {
  cartService = inject(CartService);
  router = inject(Router);
  private readonly language = inject(LanguageService);

  couponInput = '';
  couponFeedback = '';
  isError = false;

  /** عتبة التوصيل المجاني كما تنطبق في CartService (توصيل مجاني فوق 400) */
  readonly freeDeliveryThreshold = 400;

  get freeDeliveryProgress(): number {
    return Math.min(100, (this.cartService.subtotal() / this.freeDeliveryThreshold) * 100);
  }

  get amountToFreeDelivery(): number {
    return Math.max(0, this.freeDeliveryThreshold - this.cartService.subtotal());
  }

  productName(name: string | undefined): string {
    if (!name) return '';
    const parts = name.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return name;

    const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
    const lang = this.language.lang();

    const match = parts.find((p) => (lang === 'ar' ? isArabic(p) : !isArabic(p)));
    return match ?? name;
  }

  applyCoupon() {
    if (!this.couponInput.trim()) return;
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
