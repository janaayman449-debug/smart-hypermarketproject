import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { OfferService } from '../../services/offers.service';
import { LanguageService } from '../../services/language.service';
import { getCategoryLabel } from '../../services/category-meta';
import { Product } from '../../models/hypermarket.models';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './offers.html',
  styleUrl: './offers.css'
})
export class Offers implements OnInit, OnDestroy {
  cartService = inject(CartService);
  productService = inject(ProductService);
  offerService = inject(OfferService);
  router = inject(Router);
  private readonly language = inject(LanguageService);

  hours = signal(14);
  minutes = signal(35);
  seconds = signal(48);
  private timerInterval: any;

  copiedCode: string | null = null;

  ngOnInit() {
    this.offerService.fetchOffers();

    this.timerInterval = setInterval(() => {
      if (this.seconds() > 0) {
        this.seconds.update((s) => s - 1);
      } else {
        this.seconds.set(59);
        if (this.minutes() > 0) {
          this.minutes.update((m) => m - 1);
        } else {
          this.minutes.set(59);
          if (this.hours() > 0) {
            this.hours.update((h) => h - 1);
          } else {
            clearInterval(this.timerInterval);
          }
        }
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  copyCoupon(code: string) {
    this.copiedCode = code;
    navigator.clipboard?.writeText(code);
    this.cartService.applyCoupon(code);
    setTimeout(() => {
      this.copiedCode = null;
    }, 2500);
  }

  addDealProduct(product: Product) {
    this.cartService.addToCart(product, 1);
    this.cartService.openDrawer();
  }

  minSpendLabel(minSpend: number): string {
    if (minSpend <= 0) return 'offers.noMinimum';
    return `offers.minSpendCustom`;
  }

  /** Splits a mixed "Arabic/English" product name and returns only the part
   *  matching the current UI language. Falls back to the full name if the
   *  string has no "/" separator or no part matches the current language. */
  productName(name: string | undefined): string {
    if (!name) return '';
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