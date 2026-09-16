import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { WishlistService } from '../../services/wishlist.service';
import { LanguageService } from '../../services/language.service';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { getCategoryLabel } from '../../services/category-meta';
import { Product } from '../../models/hypermarket.models';

type SortOption = 'newest' | 'price-low' | 'price-high';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products {
  protected readonly wishlistService = inject(WishlistService);
  protected readonly language = inject(LanguageService);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);

  readonly searchTerm = signal('');
  readonly selectedCategory = signal('');
  readonly sortBy = signal<SortOption>('newest');
  readonly justAddedId = signal<string | null>(null);

  // فئات المتجر الحقيقية (نفسها المستخدمة في لوحة تحكم الأدمن وصفحة الأقسام)
  readonly categories = this.productService.categoriesList;

  constructor() {
    const categoryFromUrl = this.route.snapshot.queryParamMap.get('category');
    if (categoryFromUrl) {
      this.selectedCategory.set(categoryFromUrl);
    }
  }

  readonly filteredProducts = computed<Product[]>(() => {
    let list = this.productService.getProducts();
    const search = this.searchTerm().toLowerCase().trim();
    const cat = this.selectedCategory();
    const sort = this.sortBy();

    if (search) {
      list = list.filter((p) => p.name.toLowerCase().includes(search));
    }

    if (cat) {
      list = list.filter((p) => p.category === cat);
    }

    list = [...list];
    if (sort === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  });

  toggleWishlist(product: Product): void {
    if (this.isInWishlist(product.id)) {
      this.wishlistService.removeFromWishlist(product.id);
    } else {
      this.wishlistService.addToWishlist(product);
    }
  }

  isInWishlist(productId: string): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
    this.justAddedId.set(product.id);
    setTimeout(() => this.justAddedId.set(null), 1500);
  }

  categoryLabel(category: string): string {
    return getCategoryLabel(category, this.language.lang());
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

  /** Cuts long mixed Arabic/English product names to a fixed length so cards stay equal height,
   *  avoiding the browser's line-clamp + bidi rendering glitch. */
  truncate(text: string, max: number = 45): string {
    return text.length > max ? text.slice(0, max).trim() + '…' : text;
  }

  protected translate(key: string): string {
    return this.language.t(key);
  }
}