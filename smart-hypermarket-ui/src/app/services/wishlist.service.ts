import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { getCategoryImage } from './category-meta';
import { API_URL, UPLOADS_URL } from '../config/api.config';

export interface WishlistItem {
  id: number | string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  unit?: string;
  stock?: number;
  [key: string]: any;
}

const API_BASE = `${API_URL}/wishlist`;
const IMAGE_BASE = UPLOADS_URL;

interface BackendWishlistItem {
  _id: string;
  user: string;
  product: {
    _id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
    description: string;
    image?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly items = signal<WishlistItem[]>([]);
  readonly count = computed(() => this.items().length);

  constructor() {
    this.fetchWishlist();
  }

  private mapFromApi(item: BackendWishlistItem): WishlistItem {
    const p = item.product;
    return {
      id: p._id,
      name: p.name,
      price: p.price,
      category: p.category,
      stock: p.stock,
      image: p.image ? IMAGE_BASE + p.image : getCategoryImage(p.category),
    };
  }

  async fetchWishlist(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.items.set([]);
      return;
    }

    try {
      const res = await firstValueFrom(
        this.http.get<{ status: string; data: { items: BackendWishlistItem[] } }>(API_BASE)
      );
      this.items.set(res.data.items.map((i) => this.mapFromApi(i)));
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    }
  }

  async addToWishlist(product: WishlistItem): Promise<void> {
    if (this.isInWishlist(product.id)) return;

    try {
      await firstValueFrom(
        this.http.post(API_BASE, { productId: product.id })
      );
      this.items.update((list) => [...list, product]);
    } catch (err) {
      console.error('Failed to add to wishlist', err);
    }
  }

  async removeFromWishlist(productId: number | string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${API_BASE}/${productId}`)
      );
      this.items.update((list) => list.filter((item) => String(item.id) !== String(productId)));
    } catch (err) {
      console.error('Failed to remove from wishlist', err);
    }
  }

  remove(productId: number | string): void {
    this.removeFromWishlist(productId);
  }

  toggleWishlist(product: WishlistItem): void {
    if (this.isInWishlist(product.id)) {
      this.removeFromWishlist(product.id);
    } else {
      this.addToWishlist(product);
    }
  }

  isInWishlist(productId: number | string): boolean {
    return this.items().some((item) => String(item.id) === String(productId));
  }

  clear(): void {
    this.items.set([]);
  }
}