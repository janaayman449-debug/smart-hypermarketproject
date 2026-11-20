import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { PaymentService, validateProofFile, MAX_PROOF_BYTES } from '../../services/payment.service';
import { NotificationService } from '../../services/notification.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate';
import { getProductName } from '../../services/product-name';
import { Order, PaymentMethod } from '../../models/hypermarket.models';

type DeliverySlot = 'express' | 'morning' | 'afternoon' | 'evening';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit, OnDestroy {
  protected readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  protected readonly payment = inject(PaymentService);
  protected readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  @ViewChild('proofInput') private proofInput?: ElementRef<HTMLInputElement>;

  protected readonly submitted = signal(false);
  protected readonly placedOrder = signal<Order | null>(null);
  protected readonly proofError = signal('');
  protected readonly proofUploading = signal(false);
  protected readonly copied = signal(false);

  /** Set once a valid screenshot has been attached. */
  protected proofFile: File | null = null;
  /** Local preview for the chosen screenshot. */
  protected proofPreview = signal<string | null>(null);
  /** Optional transfer reference to help the admin match the payment. */
  protected proofReference = '';

  protected readonly maxProofBytes = MAX_PROOF_BYTES;
  protected readonly maxProofMb = Math.round(MAX_PROOF_BYTES / (1024 * 1024));

  protected customerName = '';
  protected customerEmail = '';
  protected customerPhone = '';
  protected deliveryAddress = '';
  protected deliveryCity = '';
  protected deliverySlot: DeliverySlot = 'morning';
  protected deliveryNotes = '';

  /**
   * Cash on Delivery and InstaPay are both offered. Card payments stay
   * removed. Defaults to Cash so a customer is never blocked by an
   * InstaPay configuration problem.
   */
  protected paymentMethod: PaymentMethod = 'Cash';

  protected readonly deliverySlotLabels: Record<DeliverySlot, string> = {
    express: 'checkout.slotExpress',
    morning: 'checkout.slotMorning',
    afternoon: 'checkout.slotAfternoon',
    evening: 'checkout.slotEvening',
  };

  protected get instapay() {
    return this.payment.instapay();
  }

  protected get instapayReady(): boolean {
    return this.instapay?.configured === true;
  }

  protected get proofReady(): boolean {
    return this.proofFile !== null;
  }

  protected get isInstapay(): boolean {
    return this.paymentMethod === 'InstaPay';
  }

  protected get isCash(): boolean {
    return this.paymentMethod === 'Cash';
  }

  /**
   * Cash on Delivery needs no screenshot. InstaPay needs a proof screenshot
   * and a configured receiving account before an order can be accepted.
   */
  protected get canSubmit(): boolean {
    if (this.isCash) return true;
    return this.proofReady && this.instapayReady;
  }

  ngOnInit(): void {
    void this.payment.loadInstapay();
    this.notifications.startPolling();
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }

  /** Language-aware product name, shared with the cart and product card so
   *  a stored "عربي/English" name is never rendered raw in the summary. */
  protected productName(name: string | undefined): string {
    return getProductName(name ?? '', this.language.lang());
  }

  // ---------------- payment proof selection ----------------

  protected onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const problem = validateProofFile(file);
    if (problem) {
      this.proofError.set(`checkout.proofError.${problem}`);
      input.value = '';
      this.proofFile = null;
      this.clearPreview();
      return;
    }

    this.proofError.set('');
    this.proofFile = file;

    this.clearPreview();
    this.proofPreview.set(URL.createObjectURL(file));
  }

  protected removeProof(): void {
    this.proofFile = null;
    this.proofReference = '';
    this.proofError.set('');
    this.clearPreview();
    if (this.proofInput) {
      this.proofInput.nativeElement.value = '';
    }
  }

  private clearPreview(): void {
    const current = this.proofPreview();
    if (current) {
      URL.revokeObjectURL(current);
      this.proofPreview.set(null);
    }
  }

  protected async copyInstapayDetails(): Promise<void> {
    const ok = await this.payment.copyDetails();
    this.copied.set(ok);
    if (ok) {
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  // ---------------- submit ----------------

  protected async placeOrder(form: NgForm): Promise<void> {
    if (form.invalid || this.cart.items().length === 0) {
      this.submitted.set(true);
      return;
    }

    // Cash on Delivery has no proof step at all. These guards apply only when
    // the customer actually chose InstaPay. The file is captured in a local so
    // the non-null check survives the awaits that follow.
    let proof: File | null = null;
    if (this.isInstapay) {
      if (!this.proofFile) {
        this.proofError.set('checkout.proofError.required');
        this.submitted.set(true);
        return;
      }

      if (!this.instapayReady) {
        this.proofError.set('checkout.proofError.notConfigured');
        return;
      }

      proof = this.proofFile;
    } else {
      this.proofError.set('');
    }

    this.proofUploading.set(true);

    let order: Order;
    try {
      // 1. Create the order. The server sets paymentStatus = "Pending"
      //    itself; the client never asserts a payment state.
      order = await this.orderService.createOrder({
        customerName: this.customerName,
        customerEmail: this.customerEmail,
        customerPhone: this.customerPhone,
        deliveryAddress: this.deliveryAddress,
        deliveryCity: this.deliveryCity,
        deliverySlot: this.deliverySlotLabels[this.deliverySlot],
        deliveryNotes: this.deliveryNotes || undefined,
        subtotal: this.cart.subtotal(),
        categoryDiscountTotal: this.cart.categoryDiscountTotal(),
        couponCode: this.cart.appliedCoupon() || undefined,
        couponDiscountTotal: this.cart.couponDiscountTotal(),
        pointsRedeemed: this.cart.redeemedPoints(),
        pointsDiscountTotal: this.cart.pointsDiscountTotal(),
        deliveryFee: this.cart.deliveryFee(),
        grandTotal: this.cart.grandTotal(),
        paymentMethod: this.paymentMethod,
      });
    } catch (err) {
      this.proofUploading.set(false);
      console.error('Failed to place order', err);
      this.proofError.set('checkout.proofError.orderFailed');
      return;
    }

    // 2. Cash on Delivery is complete: the order was placed and nothing is
    //    pending review. Only InstaPay attaches a transfer screenshot.
    if (this.isCash) {
      this.placedOrder.set(order);
      this.proofUploading.set(false);
      await this.cart.fetchCart();
      void this.notifications.refreshUnreadCount();

      setTimeout(() => {
        this.router.navigate(['/orders']);
      }, 2500);
      return;
    }

    // 3. Attach the transfer screenshot. Until an admin verifies it, the
    //    order stays in "ProofSubmitted" - uploading never means "paid".
    //    Reached only for InstaPay; the guard above already guaranteed a
    //    file, so this is only there to satisfy the type checker.
    if (!proof) return;

    try {
      await this.payment.submitProof(order.id, proof, this.proofReference);
    } catch (err: any) {
      // The order exists, so tell the customer honestly: the order was placed
      // but the proof did not upload, and they can retry from My Orders.
      this.proofUploading.set(false);
      console.error('Failed to upload payment proof', err);
      this.placedOrder.set(order);
      this.proofError.set(err?.error?.message || 'checkout.proofError.uploadFailed');
      await this.cart.fetchCart();
      return;
    }

    this.placedOrder.set(order);
    this.proofUploading.set(false);
    await this.cart.fetchCart();
    void this.notifications.refreshUnreadCount();

    setTimeout(() => {
      this.router.navigate(['/orders']);
    }, 2500);
  }
}
