import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate';
import { getProductName } from '../../services/product-name';
import { getCategoryLabel } from '../../services/category-meta';

@Component({
  selector: 'app-cart',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  protected readonly cart = inject(CartService);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AuthService);
  protected couponInput = '';
  protected couponMessage = signal('');
  protected couponSuccess = signal(false);

  /** ملاحظة المكافآت أسفل الملخص — مربوطة برصيد نقاط المستخدم الفعلي */
  protected readonly pointsNote = computed<string | null>(() => {
    const points = this.auth.currentUser()?.points ?? 0;
    if (points <= 0) return null;
    const worth = Math.floor(points * 0.1);
    const t = this.language.t.bind(this.language);
    return `${t('profile.rewardsBalance')}: ${points} ${t('profile.points')} — ${t('profile.worth')} ${worth} ${t('home.currency')}`;
  });

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
   *  matching the current UI language. Delegates to the shared helper so the
   *  cart, checkout and product card all resolve names identically. */
  protected productName(name: string | undefined): string {
    return getProductName(name ?? '', this.language.lang());
  }

  /** Category label localised for the current UI language. */
  protected categoryLabel(category: string | undefined): string {
    return getCategoryLabel(category ?? '', this.language.lang());
  }
}