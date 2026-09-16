import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.css',
})
export class CartDrawer {
  protected readonly cart = inject(CartService);

  protected increase(productId: string, currentQty: number): void {
    this.cart.updateQuantity(productId, currentQty + 1);
  }

  protected decrease(productId: string, currentQty: number): void {
    this.cart.updateQuantity(productId, currentQty - 1);
  }

  protected remove(productId: string): void {
    this.cart.removeFromCart(productId);
  }

  protected close(): void {
    this.cart.closeDrawer();
  }
}