import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const MESSAGES_API = 'http://localhost:5000/api/messages';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly http = inject(HttpClient);

  private readonly _messages = signal<ContactMessage[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal('');

  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly unreadCount = computed(() => this._messages().filter((m) => !m.read).length);

  async loadMessages(): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { messages: ContactMessage[] } }>(MESSAGES_API)
      );
      this._messages.set(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages', err);
      this._error.set('تعذر تحميل الرسائل.');
    } finally {
      this._loading.set(false);
    }
  }

  async markRead(msg: ContactMessage): Promise<void> {
    if (msg.read) return;
    try {
      await firstValueFrom(this.http.patch(`${MESSAGES_API}/${msg._id}/read`, {}));
      this._messages.update((list) =>
        list.map((m) => (m._id === msg._id ? { ...m, read: true } : m))
      );
    } catch (err) {
      console.error('Failed to mark message as read', err);
    }
  }
}