import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, CartItem } from '../models/hypermarket.models';
import { AuthService } from './auth.service';

const API_BASE = 'http://localhost:5000/api/cart';
const IMAGE_BASE = 'http://localhost:5000/uploads/';

const VALID_COUPONS: Record<string, number> = {
  WELCOME10: 0.10,
  SMART20: 0.20,
};

interface BackendCartItem {
  product: {
    _id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
    description: string;
    image?: string;
  } | null;
  quantity: number;
}

interface BackendCart {
  _id: string;
  user: string;
  items: BackendCartItem[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  items = signal<CartItem[]>([]);
  appliedCoupon = signal<string | null>(null);
  isDrawerOpen = signal<boolean>(false);
  redeemedPoints = signal<number>(0);

  itemCount = computed(() => this.items().reduce((acc, item) => acc + item.quantity, 0));
  subtotal = computed(() => this.items().reduce((acc, item) => acc + item.product.price * item.quantity, 0));
  categoryDiscountTotal = computed(() => 0);

  couponDiscountTotal = computed(() => {
    const code = this.appliedCoupon();
    const rate = code ? VALID_COUPONS[code] ?? 0 : 0;
    return this.subtotal() * rate;
  });

  pointsDiscountTotal = computed(() => this.redeemedPoints() * 0.1);
  deliveryFee = computed(() => (this.subtotal() > 400 || this.items().length === 0 ? 0 : 30));

  grandTotal = computed(() =>
    Math.max(
      0,
      this.subtotal() - this.categoryDiscountTotal() - this.couponDiscountTotal() - this.pointsDiscountTotal() + this.deliveryFee()
    )
  );

  constructor() {
    this.fetchCart();
  }

  private mapFromApi(cart: BackendCart): CartItem[] {
    return cart.items
      .filter((i) => i.product !== null)
      .map((i) => {
        const p = i.product!;
        const product: Product = {
          id: p._id,
          name: p.name,
          price: p.price,
          category: p.category,
          stock: p.stock,
          description: p.description,
          image: p.image ? IMAGE_BASE + p.image : 'https://picsum.photos/seed/' + p._id + '/400/400',
        } as Product;

        const itemSubtotal = product.price * i.quantity;
        return {
          product,
          quantity: i.quantity,
          categoryDiscountRate: 0,
          categoryDiscountAmount: 0,
          itemSubtotal,
          finalPrice: itemSubtotal,
        };
      });
  }

  async fetchCart(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.items.set([]);
      return;
    }

    try {
      const res = await firstValueFrom(
        this.http.get<{ status: string; data: { cart: BackendCart } }>(API_BASE)
      );
      this.items.set(this.mapFromApi(res.data.cart));
    } catch (err) {
      console.error('Failed to fetch cart', err);
    }
  }

  openDrawer(): void { this.isDrawerOpen.set(true); }
  closeDrawer(): void { this.isDrawerOpen.set(false); }
  toggleDrawer(): void { this.isDrawerOpen.update(v => !v); }

  async addToCart(product: Product, quantity: number = 1): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ status: string; data: { cart: BackendCart } }>(
          API_BASE,
          { productId: product.id, quantity }
        )
      );
      this.items.set(this.mapFromApi(res.data.cart));
    } catch (err) {
      console.error('Failed to add to cart', err);
    }
  }

  async removeFromCart(productId: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.delete<{ status: string; data: { cart: BackendCart } }>(`${API_BASE}/${productId}`)
      );
      this.items.set(this.mapFromApi(res.data.cart));
    } catch (err) {
      console.error('Failed to remove from cart', err);
    }
  }

  async updateQuantity(productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeFromCart(productId);
      return;
    }

    try {
      const res = await firstValueFrom(
        this.http.patch<{ status: string; data: { cart: BackendCart } }>(
          `${API_BASE}/${productId}`,
          { quantity }
        )
      );
      this.items.set(this.mapFromApi(res.data.cart));
    } catch (err) {
      console.error('Failed to update quantity', err);
    }
  }

  applyCoupon(code: string): { success: boolean; message: string } {
    const normalized = code.trim().toUpperCase();
    if (!VALID_COUPONS[normalized]) {
      return { success: false, message: 'كود الخصم غير صحيح' };
    }
    this.appliedCoupon.set(normalized);
    return { success: true, message: `تم تفعيل الكوبون ${normalized}` };
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
  }

  async clearCart(): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(API_BASE));
      this.items.set([]);
      this.appliedCoupon.set(null);
      this.redeemedPoints.set(0);
    } catch (err) {
      console.error('Failed to clear cart', err);
    }
  }

  clearLocal(): void {
    this.items.set([]);
    this.appliedCoupon.set(null);
    this.redeemedPoints.set(0);
  }
}