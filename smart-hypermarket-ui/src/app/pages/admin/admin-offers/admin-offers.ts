import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfferService, Offer } from '../../../services/offers.service';
import { TranslatePipe } from '../../../pipes/translate';

interface OfferFormDraft {
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number | null;
  minSpend: number | null;
  expiresAt: string;
}

const EMPTY_DRAFT: OfferFormDraft = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: null,
  minSpend: null,
  expiresAt: '',
};

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-offers.html',
  styleUrl: '../admin.css',
})
export class AdminOffers {
  offersService = inject(OfferService);

  showAddForm = signal(false);
  newOffer = signal<OfferFormDraft>({ ...EMPTY_DRAFT });
  addOfferError = signal('');

  constructor() {
    this.offersService.fetchAllOffersAdmin();
  }

  openAddForm(): void {
    this.newOffer.set({ ...EMPTY_DRAFT });
    this.addOfferError.set('');
    this.showAddForm.set(true);
  }

  cancelAddOffer(): void {
    this.showAddForm.set(false);
  }

  submitAddOffer(): void {
    const draft = this.newOffer();

    if (!draft.code.trim() || !draft.title.trim() || !draft.description.trim() || draft.discountValue === null) {
      this.addOfferError.set('admin.fillAllFields');
      return;
    }

    this.offersService.createOffer({
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      discountType: draft.discountType,
      discountValue: draft.discountValue,
      minSpend: draft.minSpend ?? 0,
      expiresAt: draft.expiresAt || undefined,
    });

    this.showAddForm.set(false);
  }

  async toggleActive(offer: Offer): Promise<void> {
    await this.offersService.updateOffer(offer.id, { active: !offer.active });
  }

  async deleteOffer(id: string): Promise<void> {
    await this.offersService.deleteOffer(id);
  }
}