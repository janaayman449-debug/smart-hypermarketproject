import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { Orders } from '../orders/orders';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Orders, TranslatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  activeTab: 'details' | 'orders' = 'details';

  isEditing = false;
  saveMessage = '';

  name = '';
  phone = '';
  email = '';
  address = '';

  ngOnInit(): void {
    this.loadFromCurrentUser();

    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (requestedTab === 'orders') {
      this.activeTab = 'orders';
    }
  }

  setTab(tab: 'details' | 'orders'): void {
    this.activeTab = tab;
  }

  private loadFromCurrentUser(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    this.name = user.name;
    this.phone = user.phone;
    this.email = user.email;
    this.address = user.address;
  }

  saveProfile(): void {
    if (!this.name.trim() || !this.phone.trim()) {
      this.saveMessage = 'Please fill in your name and phone number.';
      return;
    }

    this.authService.updateProfile({
      name: this.name.trim(),
      phone: this.phone.trim(),
      address: this.address.trim(),
    });

    this.isEditing = false;
    this.saveMessage = 'Your profile has been updated successfully.';

    setTimeout(() => (this.saveMessage = ''), 3500);
  }
}