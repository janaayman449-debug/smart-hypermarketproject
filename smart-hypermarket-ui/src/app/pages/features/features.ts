import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate';

interface FeatureItem {
  icon: string;
  titleKey: string;
  descKey: string;
}

interface StepItem {
  number: string;
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'app-features',
  imports: [RouterLink, TranslatePipe],
  styleUrl: './features.css',
  templateUrl: './features.html',
})
export class Features {
  protected readonly features: FeatureItem[] = [
    { icon: 'fa-truck-fast', titleKey: 'home.features.delivery.title', descKey: 'home.features.delivery.desc' },
    { icon: 'fa-leaf', titleKey: 'home.features.quality.title', descKey: 'home.features.quality.desc' },
    { icon: 'fa-tags', titleKey: 'home.features.prices.title', descKey: 'home.features.prices.desc' },
    { icon: 'fa-rotate-left', titleKey: 'home.features.returns.title', descKey: 'home.features.returns.desc' },
  ];

  protected readonly steps: StepItem[] = [
    { number: '01', titleKey: 'home.steps.choose.title', descKey: 'home.steps.choose.desc' },
    { number: '02', titleKey: 'home.steps.prepare.title', descKey: 'home.steps.prepare.desc' },
    { number: '03', titleKey: 'home.steps.deliver.title', descKey: 'home.steps.deliver.desc' },
    { number: '04', titleKey: 'home.steps.enjoy.title', descKey: 'home.steps.enjoy.desc' },
  ];
}
