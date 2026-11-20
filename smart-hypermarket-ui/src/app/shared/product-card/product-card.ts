import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { LanguageService } from '../../services/language.service';
import { getCategoryLabel } from '../../services/category-meta';
import { getProductName } from '../../services/product-name';
import { TranslatePipe } from '../../pipes/translate';

/**
 * Minimal shape every product source in the app satisfies. The catalogue
 * (Product), the wishlist (WishlistItem) and the AI assistant payload all map
 * onto this, which is what lets one card serve every screen.
 */
export interface ProductCardData {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  category?: string;
  unit?: string;
  stock?: number;
}

/**
 * The single product-card implementation for the whole application.
 *
 * It owns every piece of card behaviour that used to be copy-pasted per page:
 * language-aware name + category resolution, wishlist state, add-to-cart
 * feedback and the equal-height layout. Pages only choose presentation.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  protected readonly language = inject(LanguageService);

  /** The product to render. */
  readonly product = input.required<ProductCardData>();

  /**
   * Card width preset. `grid` is the default catalogue card, `compact` is for
   * dense strips (related products) and `mini` is for very narrow containers
   * such as the AI chat bubble. `wide` is for 2-up rows.
   */
  readonly size = input<'grid' | 'compact' | 'mini' | 'wide'>('grid');

  /** Shows the heart toggle in the media corner. */
  readonly showFavorite = input(true);

  /** Shows the add-to-cart control in the footer. */
  readonly showAdd = input(true);

  /** Optional label above the price, e.g. "Save 20%". Rendered as a ribbon. */
  readonly ribbon = input<string | null>(null);

  /** Optional struck-through reference price. */
  readonly oldPrice = input<number | null>(null);

  /** Optional small note under the title, e.g. "Only 4 left". */
  readonly note = input<string | null>(null);

  /**
   * When set, the footer action becomes a labelled button with this text
   * instead of the circular add control (used by the wishlist "move to cart").
   */
  readonly actionLabel = input<string | null>(null);

  /**
   * When true the footer action is a destructive/remove affordance rendered in
   * the muted palette (used by the wishlist remove button).
   */
  readonly actionIsRemove = input(false);

  /**
   * When true the add-to-cart control also opens the cart drawer, matching the
   * previous behaviour of the offers page.
   */
  readonly openDrawerOnAdd = input(false);

  /** Emitted after the add/remove action runs, for page-level side effects. */
  readonly actioned = output<ProductCardData>();

  /** Tracks the ✓ confirmation state of the add button per card instance. */
  protected readonly justAdded = signal(false);

  protected readonly name = computed(() => getProductName(this.product().name, this.language.lang()));

  protected readonly category = computed(() => {
    const category = this.product().category;
    return category ? getCategoryLabel(category, this.language.lang()) : '';
  });

  protected readonly imageUrl = computed(() => this.product().image || PLACEHOLDER_IMAGE);

  /** Rounded so the struck-through price reads as a clean whole number. */
  protected readonly oldPriceValue = computed(() => {
    const value = this.oldPrice();
    return value === null ? null : Math.round(value);
  });

  protected readonly isFavorite = computed(() => this.wishlistService.isInWishlist(this.product().id));

  protected readonly outOfStock = computed(() => (this.product().stock ?? 1) <= 0);

  protected readonly lowStock = computed(() => {
    const stock = this.product().stock ?? 0;
    return stock > 0 && stock < 15;
  });

  protected readonly lowStockLabel = computed(() => {
    const stock = this.product().stock ?? 0;
    return this.language.lang() === 'ar' ? `كمية محدودة · ${stock}` : `Only ${stock} left`;
  });

  protected readonly ariaFavorite = computed(() =>
    this.isFavorite()
      ? this.language.lang() === 'ar'
        ? 'إزالة من المفضلة'
        : 'Remove from wishlist'
      : this.language.lang() === 'ar'
        ? 'إضافة إلى المفضلة'
        : 'Add to wishlist'
  );

  protected readonly ariaAdd = computed(() =>
    `${this.language.t('products.addToCart')} ${this.name()}`
  );

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const product = this.product();
    if (this.isFavorite()) {
      this.wishlistService.remove(product.id);
    } else {
      this.wishlistService.addToWishlist(product as never);
    }
  }

  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.outOfStock()) return;

    const product = this.product();
    this.cartService.addToCart(product as never, 1);
    if (this.openDrawerOnAdd()) this.cartService.openDrawer();

    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1400);
    this.actioned.emit(product);
  }
}

/** Neutral 1:1 fallback so a missing image never collapses the media box. */
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">' +
      '<rect width="120" height="80" fill="#efeade"/>' +
      '<path d="M44 30h32l-3 22H47z" fill="none" stroke="#a8b7a3" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M52 30a8 8 0 0 1 16 0" fill="none" stroke="#a8b7a3" stroke-width="2"/>' +
      '</svg>'
  );
