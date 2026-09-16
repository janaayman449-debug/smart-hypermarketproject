import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesService, ContactMessage } from '../../../services/messages.service';
import { TranslatePipe } from '../../../pipes/translate';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './admin-messages.html',
  styleUrl: '../admin.css',
})
export class AdminMessages implements OnInit {
  protected readonly messagesService = inject(MessagesService);

  ngOnInit(): void {
    if (this.messagesService.messages().length === 0) {
      this.messagesService.loadMessages();
    }
  }

  markMessageRead(msg: ContactMessage): void {
    this.messagesService.markRead(msg);
  }
}