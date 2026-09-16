import { Component, OnInit, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { MessagesService } from '../../../services/messages.service';
import { TranslatePipe } from '../../../pipes/translate';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-layout.html',
  styleUrl: '../admin.css',
})
export class AdminLayout implements OnInit {
  protected readonly orderService = inject(OrderService);
  protected readonly messagesService = inject(MessagesService);

  protected readonly unreadMessagesCount = computed(() => this.messagesService.unreadCount());
  protected readonly pendingReturnsCount = computed(() =>
    this.orderService.returns().filter((r) => r.status === 'Pending').length
  );

  ngOnInit(): void {
    this.messagesService.loadMessages();
  }
}