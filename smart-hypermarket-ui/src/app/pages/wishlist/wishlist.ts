import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WishlistService, WishlistItem } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { LanguageService } from '../../services/language.service';
import { getCategoryLabel } from '../../services/category-meta';
import { Product } from '../../models/hypermarket.models';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css'
})
export class Wishlist {
  protected readonly wishlistService = inject(WishlistService);
  protected readonly language = inject(LanguageService);
  private readonly cartService = inject(CartService);

  remove(productId: number | string): void {
    this.wishlistService.remove(productId);
  }

  moveToCart(product: WishlistItem): void {
    this.cartService.addToCart(product as unknown as Product, 1);
    this.wishlistService.remove(product.id);
  }

  /** Splits a mixed "Arabic/English" product name and returns only the part
   *  matching the current UI language. Falls back to the full name if the
   *  string has no "/" separator or no part matches the current language. */
  productName(name: string): string {
    const parts = name.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return name;

    const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
    const lang = this.language.lang();

    const match = parts.find((p) => (lang === 'ar' ? isArabic(p) : !isArabic(p)));
    return match ?? name;
  }

  categoryLabel(category: string | undefined): string {
    return category ? getCategoryLabel(category, this.language.lang()) : '';
  }
}