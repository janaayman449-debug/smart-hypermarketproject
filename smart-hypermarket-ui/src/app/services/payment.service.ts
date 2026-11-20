import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { InstapayResponse, InstapayInfo, Order } from '../models/hypermarket.models';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { API_URL } from '../config/api.config';

const PAYMENTS_API = `${API_URL}/payments`;

/** Must stay in step with MAX_PROOF_BYTES in the backend upload middleware. */
export const MAX_PROOF_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Client-side pre-check for the transfer screenshot.
 *
 * This is a UX affordance only - it lets the customer see a clear error before
 * spending their bandwidth. The authoritative validation is the magic-byte
 * check on the server, so a file that passes here but is not a real image is
 * still rejected.
 */
export function validateProofFile(file: File): string | null {
  if (!ACCEPTED_PROOF_TYPES.includes(file.type)) {
    return 'invalidType';
  }
  if (file.size > MAX_PROOF_BYTES) {
    return 'tooLarge';
  }
  if (file.size === 0) {
    return 'empty';
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);

  private readonly _instapay = signal<InstapayInfo | null>(null);
  private readonly _copyText = signal('');
  private readonly _maxUploadBytes = signal(MAX_PROOF_BYTES);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);

  readonly instapay = this._instapay.asReadonly();
  readonly copyText = this._copyText.asReadonly();
  readonly maxUploadBytes = this._maxUploadBytes.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * Loads the receiving account details from backend configuration.
   * Cached per session so navigating between pages does not refetch.
   */
  async loadInstapay(force = false): Promise<InstapayInfo | null> {
    if (this._loaded() && !force) {
      return this._instapay();
    }

    if (!this.auth.isLoggedIn()) {
      return null;
    }

    this._loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: InstapayResponse }>(`${PAYMENTS_API}/instapay`)
      );
      this._instapay.set(res.data.instapay);
      this._copyText.set(res.data.copyText ?? '');
      this._maxUploadBytes.set(res.data.maxUploadBytes ?? MAX_PROOF_BYTES);
      this._loaded.set(true);
      return res.data.instapay;
    } catch (err) {
      console.error('Failed to load InstaPay configuration', err);
      this._loaded.set(true);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Fetches the private screenshot as a blob and returns an object URL.
   *
   * Deliberately NOT a plain `<img [src]="...">`: the proof route is
   * authenticated, and a browser does not attach the Bearer token to an image
   * request, so a direct src would always 401. Going through HttpClient means
   * the authInterceptor attaches the token.
   *
   * The caller owns the returned URL and must revoke it to avoid leaking
   * memory (see revokeProof).
   */
  async fetchProofImage(orderId: string): Promise<string> {
    const blob = await firstValueFrom(
      this.http.get(`${PAYMENTS_API}/proof/${orderId}`, {
        responseType: 'blob',
      })
    );
    return URL.createObjectURL(blob);
  }

  /** Releases an object URL created by fetchProofImage. */
  revokeProof(url: string | null): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Uploads a transfer screenshot for an order the customer owns.
   * On success the local order list is refreshed so the UI shows the new
   * "awaiting review" state without a page reload.
   */
  async submitProof(orderId: string, file: File, reference?: string): Promise<void> {
    const form = new FormData();
    form.append('proof', file, file.name);
    if (reference && reference.trim()) {
      form.append('reference', reference.trim());
    }

    await firstValueFrom(
      this.http.post<{ message?: string }>(`${PAYMENTS_API}/proof/${orderId}`, form)
    );

    // Pull the authoritative payment status back from the server.
    await this.orderService.refreshOrders();
  }

  /** Admin: the verification queue. */
  async loadVerifications(status: string): Promise<Order[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: { orders: Order[] } }>(
        `${PAYMENTS_API}/verification`,
        { params: { status } }
      )
    );
    return res.data.orders;
  }

  /** Admin: confirms a transfer, making it the only "paid" signal. */
  async verify(orderId: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${PAYMENTS_API}/verification/${orderId}`, { action: 'verify' })
    );
    await this.orderService.refreshOrders();
  }

  /** Admin: rejects a transfer. The customer is notified with the reason. */
  async reject(orderId: string, reason: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${PAYMENTS_API}/verification/${orderId}`, {
        action: 'reject',
        reason,
      })
    );
    await this.orderService.refreshOrders();
  }

  /**
   * Copy-to-clipboard for the payment details, with a fallback for browsers
   * where the async Clipboard API is unavailable (e.g. non-secure origins).
   */
  async copyDetails(): Promise<boolean> {
    const text = this._copyText();
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'absolute';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
