export type CategoryIcon =
  | 'produce'
  | 'dairy'
  | 'bakery'
  | 'pantry'
  | 'drinks'
  | 'meat'
  | 'clean'
  | 'snacks'
  | 'frozen'
  | 'personal-care';

export type CategoryTint = 'sage' | 'cream' | 'gold' | 'clay-tint';

export interface CategoryMeta {
  ar: string;
  en: string;
  icon: CategoryIcon;
  tint: CategoryTint;
}

export const categoryMeta: Record<string, CategoryMeta> = {
  'Fresh Produce':        { ar: 'خضار وفاكهة',   en: 'Fresh Produce',        icon: 'produce',       tint: 'sage' },
  'Dairy & Eggs':         { ar: 'ألبان وبيض',     en: 'Dairy & Eggs',         icon: 'dairy',         tint: 'cream' },
  'Bakery':                { ar: 'مخبوزات',        en: 'Bakery',                icon: 'bakery',        tint: 'gold' },
  'Beverages':             { ar: 'مشروبات',        en: 'Beverages',             icon: 'drinks',        tint: 'cream' },
  'Pantry & Grains':       { ar: 'بقالة وحبوب',    en: 'Pantry & Grains',       icon: 'pantry',        tint: 'gold' },
  'Snacks':                { ar: 'سناكس',          en: 'Snacks',                icon: 'snacks',        tint: 'clay-tint' },
  'Frozen Foods':          { ar: 'أطعمة مجمدة',    en: 'Frozen Foods',          icon: 'frozen',        tint: 'sage' },
  'Meat & Poultry':        { ar: 'لحوم ودواجن',    en: 'Meat & Poultry',        icon: 'meat',          tint: 'clay-tint' },
  'Household & Cleaning':  { ar: 'منزل ونظافة',    en: 'Household & Cleaning',  icon: 'clean',         tint: 'sage' },
  'Personal Care':         { ar: 'عناية شخصية',    en: 'Personal Care',         icon: 'personal-care', tint: 'cream' },
};

export function getCategoryLabel(category: string, lang: 'ar' | 'en'): string {
  const meta = categoryMeta[category];
  if (!meta) return category;
  return lang === 'ar' ? meta.ar : meta.en;
}

export function getCategoryMeta(category: string): CategoryMeta {
  return (
    categoryMeta[category] ?? { ar: category, en: category, icon: 'produce', tint: 'sage' }
  );
}

export const homeCategoryKeyToDbCategory: Record<string, string> = {
  produce: 'Fresh Produce',
  dairy: 'Dairy & Eggs',
  bakery: 'Bakery',
  meat: 'Meat & Poultry',
  clean: 'Household & Cleaning',
  drinks: 'Beverages',
};