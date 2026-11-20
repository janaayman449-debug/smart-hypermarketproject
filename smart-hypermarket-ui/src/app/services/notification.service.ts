import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppNotification } from '../models/hypermarket.models';
import { AuthService } from './auth.service';
import { API_URL } from '../config/api.config';

const NOTIFICATIONS_API = `${API_URL}/notifications`;

/** How often the badge refreshes, in ms. */
const POLL_INTERVAL = 60_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly _unread = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal('');

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unread.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasUnread = computed(() => this._unread() > 0);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  constructor() {
    this.watchAuthState();
  }

  /**
   * Starts the light badge poll. Called by the shell components so exactly one
   * interval exists for the whole app, and it is torn down on logout.
   */
  startPolling(): void {
    if (this.started || !this.auth.isLoggedIn()) return;
    this.started = true;

    void this.refreshUnreadCount();
    this.pollTimer = setInterval(() => {
      void this.refreshUnreadCount();
    }, POLL_INTERVAL);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.started = false;
    this._notifications.set([]);
    this._unread.set(0);
  }

  /**
   * Tearing the poll down on logout is done here rather than inside
   * AuthService.logout(), because AuthService cannot inject this service
   * without creating a circular dependency (this service injects AuthService).
   * Watching the auth signal achieves the same thing without the cycle.
   */
  private watchAuthState(): void {
    effect(() => {
      if (this.auth.isLoggedIn()) return;
      // Only act if a poll is actually running, so a logged-out user landing
      // on the site does not churn the signals.
      if (this.started) {
        this.stopPolling();
      }
    });
  }

  async refreshUnreadCount(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this._unread.set(0);
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { unread: number } }>(`${NOTIFICATIONS_API}/unread-count`)
      );
      this._unread.set(res.data.unread ?? 0);
    } catch (err) {
      // A failed badge poll is not worth surfacing to the user.
      console.error('Failed to refresh notification count', err);
    }
  }

  async loadNotifications(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this._notifications.set([]);
      return;
    }

    this._loading.set(true);
    this._error.set('');
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { notifications: AppNotification[] } }>(NOTIFICATIONS_API)
      );
      this._notifications.set(res.data.notifications);
      // Keep the badge consistent with what is actually on screen.
      this._unread.set(res.data.notifications.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Failed to load notifications', err);
      this._error.set('notifications.loadFailed');
    } finally {
      this._loading.set(false);
    }
  }

  async markRead(id: string): Promise<void> {
    const target = this._notifications().find((n) => n._id === id);
    if (!target || target.read) return;

    // Optimistic: the row is marked immediately, and reverted if the call
    // fails so the badge never lies about what is stored server-side.
    this.applyLocal(id, { read: true });
    try {
      await firstValueFrom(this.http.patch(`${NOTIFICATIONS_API}/${id}/read`, {}));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      this.applyLocal(id, { read: false });
    }
  }

  async markAllRead(): Promise<void> {
    if (this._unread() === 0) return;

    const snapshot = this._notifications();
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    const previous = this._unread();
    this._unread.set(0);

    try {
      await firstValueFrom(this.http.patch(`${NOTIFICATIONS_API}/read-all`, {}));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
      this._notifications.set(snapshot);
      this._unread.set(previous);
    }
  }

  async remove(id: string): Promise<void> {
    const snapshot = this._notifications();
    this.applyLocal(id, null);

    try {
      await firstValueFrom(this.http.delete(`${NOTIFICATIONS_API}/${id}`));
    } catch (err) {
      console.error('Failed to remove notification', err);
      this._notifications.set(snapshot);
    }
  }

  /**
   * Applies a local edit immediately, then reconciles the badge from the
   * resulting list so the count can never drift from the visible rows.
   * `null` removes the notification.
   */
  private applyLocal(id: string, change: { read: boolean } | null): void {
    if (change === null) {
      this._notifications.update((list) => list.filter((n) => n._id !== id));
    } else {
      this._notifications.update((list) =>
        list.map((n) => (n._id === id ? { ...n, read: change.read } : n))
      );
    }

    this._unread.set(this._notifications().filter((n) => !n.read).length);
  }
}
