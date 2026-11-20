import { Component, inject, signal, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate';
import { AppNotification } from '../../models/hypermarket.models';

/**
 * Bell + dropdown notification centre, shared by the customer navbar and the
 * admin layout so both audiences get the same behaviour from one
 * implementation.
 *
 * `audience` decides where a click navigates: a customer goes to their order,
 * an admin goes to the payment verification queue.
 */
@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.css',
})
export class NotificationCenter implements OnInit, OnDestroy {
  protected readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly open = signal(false);

  constructor() {
    // Close the dropdown when a click lands outside it.
    document.addEventListener('click', this.onDocumentClick, true);
  }

  ngOnInit(): void {
    this.notifications.startPolling();
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick, true);
  }

  protected get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  protected get list(): AppNotification[] {
    return this.notifications.notifications();
  }

  protected get hasUnread(): boolean {
    return this.notifications.hasUnread();
  }

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      void this.notifications.loadNotifications();
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  /**
   * Resolves the stored machine key into readable text. The backend stores
   * only a type + params so the same row renders in either language.
   */
  protected text(n: AppNotification): string {
    const params = {
      orderNumber: n.data?.orderNumber || n.orderNumber || '',
      reason: n.data?.reason || '',
      status: n.data?.status || '',
    };
    return this.language.t(`notifications.types.${n.type}`, params);
  }

  /** Small relative label, e.g. "5m". */
  protected timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return this.language.t('notifications.time.now');
    if (mins < 60) return this.language.t('notifications.time.minutes', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return this.language.t('notifications.time.hours', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return this.language.t('notifications.time.days', { n: days });
    return new Date(iso).toLocaleDateString(this.language.lang());
  }

  protected markRead(n: AppNotification): void {
    if (!n.read) {
      void this.notifications.markRead(n._id);
    }
  }

  protected markAllRead(): void {
    void this.notifications.markAllRead();
  }

  /** Navigates to whatever the notification is about, for this audience. */
  protected openItem(n: AppNotification): void {
    this.markRead(n);
    this.close();

    if (this.isAdmin && (n.type === 'payment_proof_submitted' || n.order)) {
      this.router.navigate(['/admin/payments']);
      return;
    }

    this.router.navigate(['/orders'], {
      queryParams: n.order ? { order: n.order } : undefined,
    });
  }

  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (!this.open()) return;
    const host = event.target as HTMLElement;
    if (host.closest('.notif-center')) return;
    this.close();
  };

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
