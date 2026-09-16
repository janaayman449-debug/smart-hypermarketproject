import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface BackendOffer {
  _id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

const API_BASE = 'http://localhost:5000/api/offers';

@Injectable({ providedIn: 'root' })
export class OfferService {
  private readonly http = inject(HttpClient);

  private readonly _offers = signal<Offer[]>([]);
  readonly offers = this._offers.asReadonly();

  constructor() {
    this.fetchOffers();
  }

  private mapFromApi(o: BackendOffer): Offer {
    return {
      id: o._id,
      code: o.code,
      title: o.title,
      description: o.description,
      discountType: o.discountType,
      discountValue: o.discountValue,
      minSpend: o.minSpend,
      active: o.active,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
    };
  }

  /** يجيب العروض النشطة بس (للعميل العادي في صفحة Offers). */
  async fetchOffers(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { offers: BackendOffer[] } }>(API_BASE)
      );
      this._offers.set(res.data.offers.map((o) => this.mapFromApi(o)));
    } catch (err) {
      console.error('Failed to fetch offers', err);
    }
  }

  /** يجيب كل العروض حتى غير النشطة (للأدمن بس). */
  async fetchAllOffersAdmin(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { offers: BackendOffer[] } }>(`${API_BASE}/admin`)
      );
      this._offers.set(res.data.offers.map((o) => this.mapFromApi(o)));
    } catch (err) {
      console.error('Failed to fetch offers (admin)', err);
    }
  }

  /** يتأكد إن كود الكوبون صحيح وسارٍ، ويرجع بيانات العرض لو تمام. */
  async validateCoupon(code: string): Promise<{ success: boolean; offer?: Offer; message?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { offer: BackendOffer } }>(`${API_BASE}/validate/${code}`)
      );
      return { success: true, offer: this.mapFromApi(res.data.offer) };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'كود الخصم غير صحيح',
      };
    }
  }

  async createOffer(offer: Partial<Offer>): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: { offer: BackendOffer } }>(API_BASE, offer)
      );
      const newOffer = this.mapFromApi(res.data.offer);
      this._offers.update((list) => [newOffer, ...list]);
    } catch (err) {
      console.error('Failed to create offer', err);
    }
  }

  async updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.patch<{ data: { offer: BackendOffer } }>(`${API_BASE}/${id}`, updates)
      );
      const updated = this.mapFromApi(res.data.offer);
      this._offers.update((list) => list.map((o) => (o.id === id ? updated : o)));
    } catch (err) {
      console.error('Failed to update offer', err);
    }
  }

  async deleteOffer(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${API_BASE}/${id}`));
      this._offers.update((list) => list.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Failed to delete offer', err);
    }
  }
}