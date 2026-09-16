import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { QuickCart } from './components/quick-cart/quick-cart';
import { AiAssistant } from './components/ai-assistant/ai-assistant';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, QuickCart, AiAssistant],
  template: `
    <app-header />
    <main class="main-viewport-content">
      <router-outlet />
    </main>
    <app-quick-cart />
    <app-ai-assistant />
    <app-footer />
  `,
})
export class App {}