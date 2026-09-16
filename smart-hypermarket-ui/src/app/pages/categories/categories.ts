import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { LanguageService } from '../../services/language.service';
import { ProductService } from '../../services/product.service';
import { TranslatePipe } from '../../pipes/translate';
import { getCategoryMeta } from '../../services/category-meta';

@Component({
  selector: 'app-categories',
  imports: [TranslatePipe],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  protected readonly language = inject(LanguageService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  protected readonly categories = this.productService.categoriesList;

  protected meta(category: string) {
    return getCategoryMeta(category);
  }

  protected label(category: string): string {
    const meta = getCategoryMeta(category);
    return this.language.lang() === 'ar' ? meta.ar : meta.en;
  }

  protected goToProducts(category: string): void {
    this.router.navigate(['/products'], { queryParams: { category } });
  }
}