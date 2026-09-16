import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatMessage, Product } from '../../models/hypermarket.models';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { LanguageService } from '../../services/language.service';

type Intent =
  | 'discounts'
  | 'recipe'
  | 'delivery'
  | 'returns'
  | 'tracking'
  | 'navigate-products'
  | 'fallback';

interface SuggestionChip {
  label: string;
  intent: Intent;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css'
})
export class AiAssistant {
  cartService = inject(CartService);
  productService = inject(ProductService);
  protected readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  isOpen = signal(false);
  inputText = signal('');
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([]);

  private lastSuggestionMap = new Map<string, Intent>();

  /** بيفضل true لحد ما المستخدم يكتب أو يدوس أول رسالة، عشان نعرف نجدد رسالة الترحيب بأمان لو اللغة اتغيرت. */
  private conversationStarted = false;

  constructor() {
    this.setGreetingMessage();

    // كل ما اللغة تتغيّر، لو المستخدم لسه مبدأش المحادثة، نعيد رسالة الترحيب باللغة الجديدة
    effect(() => {
      this.language.lang(); // نقرأ القيمة عشان الـ effect يتابعها
      if (!this.conversationStarted) {
        this.setGreetingMessage();
      }
    });
  }

  private setGreetingMessage(): void {
    this.messages.set([
      {
        id: 'msg-1',
        sender: 'ai',
        text: this.t('aiAssistant.greeting'),
        time: this.now(),
        suggestions: this.buildSuggestions([
          { label: this.t('aiAssistant.suggestions.discounts'), intent: 'discounts' },
          { label: this.t('aiAssistant.suggestions.recipe'), intent: 'recipe' },
          { label: this.t('aiAssistant.suggestions.delivery'), intent: 'delivery' },
          { label: this.t('aiAssistant.suggestions.returns'), intent: 'returns' },
        ]),
      }
    ]);
  }

  protected translate(key: string): string {
    return this.t(key);
  }

  private t(key: string): string {
    return this.language.t(key);
  }

  private now(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private buildSuggestions(chips: SuggestionChip[]): string[] {
    this.lastSuggestionMap = new Map(chips.map((c) => [c.label, c.intent]));
    return chips.map((c) => c.label);
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
  }

  contactSupport() {
    if (!this.isOpen()) this.isOpen.set(true);
    this.conversationStarted = true;

    const phone = this.t('footer.phone');
    const text = this.t('aiAssistant.customerServiceMsg').replace('{{phone}}', phone);

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: 'support-' + Date.now(),
        sender: 'ai',
        text,
        time: this.now(),
      }
    ]);
  }

  sendMessage(textToSend?: string) {
    const query = (textToSend || this.inputText()).trim();
    if (!query) return;

    this.conversationStarted = true;

    const knownIntent = this.lastSuggestionMap.get(query);

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: 'usr-' + Date.now(),
        sender: 'user',
        text: query,
        time: this.now()
      }
    ]);

    this.inputText.set('');

    if (knownIntent === 'navigate-products') {
      this.router.navigateByUrl('/products');
      this.isOpen.set(false);
      return;
    }

    this.isTyping.set(true);

    setTimeout(() => {
      this.isTyping.set(false);
      if (knownIntent) {
        this.respondWithIntent(knownIntent);
      } else {
        this.generateBotResponse(query);
      }
    }, 700);
  }

  addSuggestedProduct(product: Product) {
    this.cartService.addToCart(product, 1);
    this.cartService.openDrawer();
  }

  private respondWithIntent(intent: Intent): void {
    let reply = '';
    let suggestionChips: SuggestionChip[] = [];
    let productCard: Product | undefined = undefined;

    switch (intent) {
      case 'discounts':
        reply = this.t('aiAssistant.replies.discounts');
        suggestionChips = [
          { label: this.t('aiAssistant.quickActions.applyCoupon'), intent: 'discounts' },
          { label: this.t('aiAssistant.quickActions.browseOffers'), intent: 'discounts' },
          { label: this.t('aiAssistant.quickActions.checkProduct'), intent: 'discounts' },
        ];
        break;
      case 'recipe': {
        const berry = this.productService.getProducts().find((p) => p.id === 'prod-3');
        const brie = this.productService.getProducts().find((p) => p.id === 'prod-4');
        productCard = berry || brie;
        reply = this.t('aiAssistant.replies.recipe');
        suggestionChips = [
          { label: this.t('aiAssistant.quickActions.addBerry'), intent: 'recipe' },
          { label: this.t('aiAssistant.quickActions.showCheese'), intent: 'recipe' },
          { label: this.t('aiAssistant.quickActions.viewBread'), intent: 'recipe' },
        ];
        break;
      }
      case 'delivery':
        reply = this.t('aiAssistant.replies.delivery');
        suggestionChips = [
          { label: this.t('aiAssistant.quickActions.viewProducts'), intent: 'navigate-products' },
          { label: this.t('aiAssistant.quickActions.trackOrder'), intent: 'tracking' },
        ];
        break;
      case 'returns':
        reply = this.t('aiAssistant.replies.returns');
        suggestionChips = [
          { label: this.t('aiAssistant.quickActions.goReturns'), intent: 'returns' },
          { label: this.t('aiAssistant.quickActions.customerHotline'), intent: 'returns' },
        ];
        break;
      case 'tracking':
        reply = this.t('aiAssistant.replies.tracking');
        suggestionChips = [
          { label: this.t('aiAssistant.quickActions.openTracker'), intent: 'tracking' },
          { label: this.t('aiAssistant.quickActions.contactDriver'), intent: 'tracking' },
        ];
        break;
      default:
        reply = this.t('aiAssistant.replies.fallback');
        suggestionChips = [
          { label: this.t('aiAssistant.quickActions.exploreSpecialties'), intent: 'fallback' },
          { label: this.t('aiAssistant.quickActions.viewCategories'), intent: 'fallback' },
          { label: this.t('aiAssistant.quickActions.contactPhone'), intent: 'fallback' },
        ];
    }

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: 'bot-' + Date.now(),
        sender: 'ai',
        text: reply,
        time: this.now(),
        suggestions: this.buildSuggestions(suggestionChips),
        productCard,
      }
    ]);
  }

  private generateBotResponse(query: string) {
    const q = query.toLowerCase();
    let intent: Intent = 'fallback';

    if (q.includes('discount') || q.includes('offer') || q.includes('coupon') || q.includes('خصم') || q.includes('عرض') || q.includes('كوبون')) {
      intent = 'discounts';
    } else if (q.includes('recipe') || q.includes('dinner') || q.includes('lunch') || q.includes('طبخ') || q.includes('وصفة') || q.includes('عشا')) {
      intent = 'recipe';
    } else if (q.includes('delivery') || q.includes('time') || q.includes('fast') || q.includes('توصيل') || q.includes('وقت')) {
      intent = 'delivery';
    } else if (q.includes('return') || q.includes('refund') || q.includes('استرجاع') || q.includes('استرداد')) {
      intent = 'returns';
    } else if (q.includes('track') || q.includes('order') || q.includes('طلب') || q.includes('تتبع')) {
      intent = 'tracking';
    }

    this.respondWithIntent(intent);
  }
}