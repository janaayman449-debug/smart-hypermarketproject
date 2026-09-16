import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-cart',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  protected readonly cart = inject(CartService);
  private readonly language = inject(LanguageService);
  protected couponInput = '';
  protected couponMessage = signal('');
  protected couponSuccess = signal(false);

  protected increase(productId: string, currentQty: number): void {
    this.cart.updateQuantity(productId, currentQty + 1);
  }

  protected decrease(productId: string, currentQty: number): void {
    this.cart.updateQuantity(productId, currentQty - 1);
  }

  protected remove(productId: string): void {
    this.cart.removeFromCart(productId);
  }

  protected applyCoupon(): void {
    if (!this.couponInput.trim()) return;
    const result = this.cart.applyCoupon(this.couponInput);
    this.couponMessage.set(result.message);
    this.couponSuccess.set(result.success);
  }

  protected removeCoupon(): void {
    this.cart.removeCoupon();
    this.couponInput = '';
    this.couponMessage.set('');
  }

  /** Splits a mixed "Arabic/English" product name and returns only the part
   *  matching the current UI language. Falls back to the full name if the
   *  string has no "/" separator or no part matches the current language. */
  protected productName(name: string | undefined): string {
    if (!name) return '';
    const parts = name.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return name;

    const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
    const lang = this.language.lang();

    const match = parts.find((p) => (lang === 'ar' ? isArabic(p) : !isArabic(p)));
    return match ?? name;
  }
}