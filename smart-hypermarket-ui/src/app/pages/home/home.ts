import { Component, inject, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { LanguageService } from '../../services/language.service';
import { Product } from '../../models/hypermarket.models';

interface FeaturePill {
  icon: 'truck' | 'shield' | 'tag' | 'return';
  key: string;
}

interface Category {
  key: string;
  icon: 'produce' | 'dairy' | 'bakery' | 'meat' | 'clean' | 'drinks';
  tint: 'sage' | 'cream' | 'gold' | 'clay-tint';
}

interface Step {
  key: string;
}

@Component({
  selector: 'app-home',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements AfterViewInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly language = inject(LanguageService);
  private readonly elementRef = inject(ElementRef);

  private observer?: IntersectionObserver;

  protected readonly features: FeaturePill[] = [
    { icon: 'truck', key: 'delivery' },
    { icon: 'shield', key: 'quality' },
    { icon: 'tag', key: 'prices' },
    { icon: 'return', key: 'returns' },
  ];

  protected readonly categories: Category[] = [
    { key: 'produce', icon: 'produce', tint: 'sage' },
    { key: 'dairy', icon: 'dairy', tint: 'cream' },
    { key: 'bakery', icon: 'bakery', tint: 'gold' },
    { key: 'meat', icon: 'meat', tint: 'clay-tint' },
    { key: 'clean', icon: 'clean', tint: 'sage' },
    { key: 'drinks', icon: 'drinks', tint: 'cream' },
  ];

  // بيحول مفتاح القسم (زي produce) لاسم القسم الحقيقي المخزّن في المنتجات (زي Fresh Produce)
  private readonly categoryKeyToBackendName: Record<string, string> = {
    produce: 'Fresh Produce',
    dairy: 'Dairy & Eggs',
    bakery: 'Bakery',
    meat: 'Meat & Poultry',
    clean: 'Household & Cleaning',
    drinks: 'Beverages',
  };

  protected backendCategory(key: string): string {
    return this.categoryKeyToBackendName[key] ?? key;
  }

  protected readonly steps: Step[] = [
    { key: 'choose' },
    { key: 'prepare' },
    { key: 'deliver' },
    { key: 'enjoy' },
  ];

  // عروض الأسبوع: أول 6 منتجات فعلية من نفس ProductService بتاع صفحة /products
  protected get weeklyDeals(): Product[] {
    return this.productService.getProducts().slice(0, 6);
  }

  protected addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
    this.cartService.openDrawer();
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

  ngAfterViewInit(): void {
    // بنعمل "مراقب" بيشتغل لما أي عنصر يدخل الشاشة أثناء السكرول
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view'); // ضيفي كلاس "ظاهر" للعنصر
            this.observer?.unobserve(entry.target); // بلاش تراقبيه تاني بعد ما ظهر مرة
          }
        });
      },
      { threshold: 0.15 } // لما 15% من العنصر يبقى ظاهر في الشاشة، فعّلي الحركة
    );

    // راقبي كل العناصر اللي عليها كلاس reveal-on-scroll
    const targets = this.elementRef.nativeElement.querySelectorAll('.reveal-on-scroll');
    targets.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect(); // نضّف المراقب لما نسيب الصفحة
  }
}