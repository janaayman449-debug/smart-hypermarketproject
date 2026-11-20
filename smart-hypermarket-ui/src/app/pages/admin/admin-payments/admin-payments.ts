import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, MAX_PROOF_BYTES } from '../../../services/payment.service';
import { OrderService } from '../../../services/order.service';
import { NotificationService } from '../../../services/notification.service';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate';
import { Order } from '../../../models/hypermarket.models';

type Filter = 'pending' | 'verified' | 'rejected' | 'all';

/** Admin-facing InstaPay payment verification queue. */
@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-payments.html',
  styleUrl: '../admin.css',
})
export class AdminPayments implements OnInit, OnDestroy {
  private readonly payment = inject(PaymentService);
  private readonly orderService = inject(OrderService);
  private readonly notifications = inject(NotificationService);
  private readonly language = inject(LanguageService);

  protected readonly filter = signal<Filter>('pending');
  protected readonly loading = signal(false);
  protected readonly busyOrderId = signal<string | null>(null);
  protected readonly actionError = signal('');
  protected readonly successMessage = signal('');

  /** Order id -> object URL of the fetched proof image. */
  private readonly proofUrls = new Map<string, string>();
  protected readonly proofLoading = signal<Set<string>>(new Set());
  protected readonly proofError = signal<Set<string>>(new Set());
  /** Orders whose proof the admin has expanded. */
  protected readonly expanded = signal<Set<string>>(new Set());

  protected readonly proofFileRef = signal('');
  protected readonly rejectFor = signal<string | null>(null);
  protected rejectReason = '';

  protected readonly maxProofMb = Math.round(MAX_PROOF_BYTES / (1024 * 1024));

  ngOnInit(): void {
    void this.load();
    this.notifications.startPolling();
  }

  ngOnDestroy(): void {
    // Object URLs are not garbage collected on their own, so release them.
    for (const url of this.proofUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.proofUrls.clear();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.actionError.set('');
    try {
      await this.payment.loadVerifications(this.filter());
      await this.orderService.refreshOrders();
    } catch (err: any) {
      console.error('Failed to load verifications', err);
      this.actionError.set(err?.error?.message || 'admin.paymentVerification.actionFailed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async setFilter(next: Filter): Promise<void> {
    if (this.filter() === next) return;
    this.filter.set(next);
    this.collapseAll();
    await this.load();
  }

  /** The queue returned by the API, already filtered server-side. */
  protected get orders(): Order[] {
    return this.orderService.orders();
  }

  // ---------------- proof viewing ----------------

  protected isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  protected async toggleProof(order: Order): Promise<void> {
    const id = order.id;
    const open = this.isExpanded(id);

    if (open) {
      this.collapseAll();
      return;
    }

    this.expanded.update((s) => new Set(s).add(id));

    if (this.proofUrls.has(id)) return;

    this.setIn(this.proofLoading, id, true);
    this.setIn(this.proofError, id, false);

    try {
      // Fetched as a blob through HttpClient so the auth token is attached;
      // a plain <img src> would not carry the Bearer header.
      const url = await this.payment.fetchProofImage(id);
      this.proofUrls.set(id, url);
      this.proofFileRef.set(order.paymentProof?.originalName || '');
    } catch (err) {
      console.error('Failed to load payment proof', err);
      this.setIn(this.proofError, id, true);
    } finally {
      this.setIn(this.proofLoading, id, false);
    }
  }

  protected proofUrl(id: string): string | null {
    return this.proofUrls.get(id) ?? null;
  }

  private collapseAll(): void {
    this.expanded.set(new Set());
  }

  private setIn(
    target: ReturnType<typeof signal<Set<string>>>,
    id: string,
    present: boolean
  ): void {
    const next = new Set(target());
    if (present) next.add(id);
    else next.delete(id);
    target.set(next);
  }

  // ---------------- decisions ----------------

  protected openReject(order: Order): void {
    this.rejectFor.set(order.id);
    this.rejectReason = '';
  }

  protected cancelReject(): void {
    this.rejectFor.set(null);
    this.rejectReason = '';
  }

  protected async confirmVerify(order: Order): Promise<void> {
    this.busyOrderId.set(order.id);
    this.actionError.set('');
    this.successMessage.set('');

    try {
      await this.payment.verify(order.id);
      this.successMessage.set('admin.paymentVerification.verified');
      // The row leaves the pending queue, so drop its cached image.
      this.dropProof(order.id);
      await this.load();
      void this.notifications.refreshUnreadCount();
    } catch (err: any) {
      console.error('Failed to verify payment', err);
      this.actionError.set(err?.error?.message || 'admin.paymentVerification.actionFailed');
    } finally {
      this.busyOrderId.set(null);
    }
  }

  protected async submitReject(order: Order): Promise<void> {
    const reason = this.rejectReason.trim();
    if (!reason) {
      this.actionError.set('admin.paymentVerification.rejectRequired');
      return;
    }

    this.busyOrderId.set(order.id);
    this.actionError.set('');
    this.successMessage.set('');

    try {
      await this.payment.reject(order.id, reason);
      this.successMessage.set('admin.paymentVerification.rejected');
      this.cancelReject();
      this.dropProof(order.id);
      await this.load();
      void this.notifications.refreshUnreadCount();
    } catch (err: any) {
      console.error('Failed to reject payment', err);
      this.actionError.set(err?.error?.message || 'admin.paymentVerification.actionFailed');
    } finally {
      this.busyOrderId.set(null);
    }
  }

  private dropProof(id: string): void {
    const url = this.proofUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.proofUrls.delete(id);
    }
  }

  // ---------------- display helpers ----------------

  protected statusClass(status: string): string {
    switch (status) {
      case 'Verified':
        return 'is-green';
      case 'Rejected':
        return 'is-red';
      case 'ProofSubmitted':
        return 'is-gold';
      default:
        return '';
    }
  }

  protected statusLabel(status: string): string {
    // Reuses the same translation keys as the customer's order list, so the
    // two views can never disagree about what a status means.
    return this.language.t(`orders.paymentStatus.${status}`);
  }

  protected proofAlt(order: Order): string {
    return this.language.t('admin.paymentVerification.proofAlt', {
      order: order.orderNumber,
    });
  }
}
