import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../pipes/translate';
import { NewsletterForm } from '../newsletter-form/newsletter-form';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe, NewsletterForm],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}