import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { LanguageService } from '../../services/language.service';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../../shared/product-card/product-card';
import { getCategoryLabel } from '../../services/category-meta';
import { TranslatePipe } from '../../pipes/translate';
import { Product } from '../../models/hypermarket.models';

type SortOption = 'newest' | 'price-low' | 'price-high';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProductCard],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products {
  protected readonly language = inject(LanguageService);
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);

  readonly searchTerm = signal('');
  readonly selectedCategory = signal('');
  readonly sortBy = signal<SortOption>('newest');

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

  categoryLabel(category: string): string {
    return getCategoryLabel(category, this.language.lang());
  }

  protected translate(key: string): string {
    return this.language.t(key);
  }
}