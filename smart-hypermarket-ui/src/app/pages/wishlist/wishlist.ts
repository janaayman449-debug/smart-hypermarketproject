import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { ProductCard } from '../../shared/product-card/product-card';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ProductCard],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css'
})
export class Wishlist {
  protected readonly wishlistService = inject(WishlistService);

  /**
   * Fired by the shared card once the item has been added to the cart, so the
   * product leaves the saved list (same behaviour as the old bespoke card).
   */
  moveToCart(productId: string | number): void {
    this.wishlistService.remove(productId);
  }
}
