import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { ReturnStatus } from '../../../models/hypermarket.models';
import { TranslatePipe } from '../../../pipes/translate';

@Component({
  selector: 'app-admin-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-returns.html',
  styleUrl: '../admin.css',
})
export class AdminReturns {
  orderService = inject(OrderService);

  async changeReturnStatus(returnId: string, status: ReturnStatus): Promise<void> {
    await this.orderService.updateReturnStatus(returnId, status);
  }
}