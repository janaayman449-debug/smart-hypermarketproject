import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate';
import { getCategoryLabel } from '../../services/category-meta';
import { getProductName } from '../../services/product-name';
import { Product } from '../../models/hypermarket.models';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  protected readonly wishlistService = inject(WishlistService);
  protected readonly language = inject(LanguageService);

  private readonly productId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  protected readonly quantity = signal(1);
  protected readonly justAdded = signal(false);

  protected readonly product = computed<Product | undefined>(() => {
    const id = this.productId();
    return id ? this.productService.getProductById(id) : undefined;
  });

  protected readonly relatedProducts = computed<Product[]>(() => {
    const current = this.product();
    if (!current) return [];
    return this.productService
      .getProducts()
      .filter((p) => p.category === current.category && p.id !== current.id)
      .slice(0, 4);
  });

  constructor() {
    // كل ما اليوزر ينتقل لمنتج تاني (من "منتجات مشابهة" مثلاً)، رجّع عداد الكمية لـ 1
    effect(() => {
      this.product();
      this.quantity.set(1);
    });
  }

  protected categoryLabel(category: string): string {
    return getCategoryLabel(category, this.language.lang());
  }

  protected productName(name: string): string {
    return getProductName(name, this.language.lang());
  }

  protected increaseQty(): void {
    const stock = this.product()?.stock ?? 1;
    this.quantity.update((q) => Math.min(Math.max(stock, 1), q + 1));
  }

  protected decreaseQty(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  protected addToCart(): void {
    const product = this.product();
    if (!product || product.stock <= 0) return;
    this.cartService.addToCart(product, this.quantity());
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1800);
  }

  protected toggleWishlist(): void {
    const product = this.product();
    if (!product) return;
    if (this.wishlistService.isInWishlist(product.id)) {
      this.wishlistService.removeFromWishlist(product.id);
    } else {
      this.wishlistService.addToWishlist(product);
    }
  }

  protected isInWishlist(): boolean {
    const product = this.product();
    return product ? this.wishlistService.isInWishlist(product.id) : false;
  }
}