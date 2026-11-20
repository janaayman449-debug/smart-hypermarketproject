import { Component, signal, computed, input, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate';
import { OrderService } from '../../services/order.service';
import { PaymentService, validateProofFile } from '../../services/payment.service';
import { LanguageService } from '../../services/language.service';
import { Order } from '../../models/hypermarket.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './orders.html',
  styleUrls: ['./orders.css']
})
export class Orders implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly payment = inject(PaymentService);
  private readonly language = inject(LanguageService);

  readonly embedded = input<boolean>(false);

  readonly activeTab = signal<string>('all');
  readonly expandedOrderId = signal<string | null>(null);

  /** Order whose replacement proof is being uploaded. */
  readonly resubmittingFor = signal<string | null>(null);
  readonly resubmitError = signal('');
  readonly resubmitBusy = signal(false);
  readonly proofPreview = signal<string | null>(null);

  private replacementFile: File | null = null;

  @ViewChild('replacementInput') private replacementInput?: ElementRef<HTMLInputElement>;

  private readonly userOrders = computed<Order[]>(() => this.orderService.orders());

  ngOnInit(): void {
    this.orderService.refreshOrders();
  }

  get filteredOrders(): Order[] {
    const tab = this.activeTab();
    const all = this.userOrders();
    if (tab === 'all') return all;
    return all.filter((o) => o.orderStatus === tab);
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  toggleExpand(orderId: string): void {
    this.expandedOrderId.update((id) => (id === orderId ? null : orderId));
  }

  formatDate(dateInput: string): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isEligibleForReturn(order: Order): boolean {
    return this.orderService.isReturnEligible(order);
  }

  // ---------------- payment status ----------------

  paymentStatusLabel(status: string): string {
    return this.language.t(`orders.paymentStatus.${status}`);
  }

  paymentStatusClass(status: string): string {
    switch (status) {
      case 'Verified':
      case 'Paid':
        return 'is-verified';
      case 'Rejected':
        return 'is-rejected';
      case 'ProofSubmitted':
        return 'is-pending';
      default:
        return 'is-waiting';
    }
  }

  /** A customer may (re)upload a proof only while it is not yet verified. */
  canUploadProof(order: Order): boolean {
    if (order.paymentMethod !== 'InstaPay') return false;
    if (order.orderStatus === 'Cancelled') return false;
    return order.paymentStatus === 'Pending' || order.paymentStatus === 'Rejected';
  }

  rejectionReason(order: Order): string {
    return order.paymentReview?.rejectionReason ?? '';
  }

  openResubmit(order: Order): void {
    this.resubmittingFor.set(order.id);
    this.resubmitError.set('');
  }

  cancelResubmit(): void {
    this.resubmittingFor.set(null);
    this.replacementFile = null;
    this.resubmitError.set('');
    this.clearPreview();
    if (this.replacementInput) {
      this.replacementInput.nativeElement.value = '';
    }
  }

  onReplacementSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const problem = validateProofFile(file);
    if (problem) {
      this.resubmitError.set(`checkout.proofError.${problem}`);
      input.value = '';
      this.replacementFile = null;
      this.clearPreview();
      return;
    }

    this.resubmitError.set('');
    this.replacementFile = file;
    this.clearPreview();
    this.proofPreview.set(URL.createObjectURL(file));
  }

  private clearPreview(): void {
    const current = this.proofPreview();
    if (current) {
      URL.revokeObjectURL(current);
      this.proofPreview.set(null);
    }
  }

  async submitReplacement(order: Order): Promise<void> {
    if (!this.replacementFile) {
      this.resubmitError.set('checkout.proofError.required');
      return;
    }

    this.resubmitBusy.set(true);
    this.resubmitError.set('');

    try {
      await this.payment.submitProof(order.id, this.replacementFile);
      this.cancelResubmit();
    } catch (err: any) {
      this.resubmitError.set(err?.error?.message || 'checkout.proofError.uploadFailed');
    } finally {
      this.resubmitBusy.set(false);
    }
  }
}