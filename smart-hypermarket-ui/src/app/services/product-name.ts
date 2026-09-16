export type AppLang = 'ar' | 'en';

const ARABIC_REGEX = /[\u0600-\u06FF]/;

/**
 * بياخد اسم المنتج زي ما هو مخزّن في الداتابيز
 * ("عربي/English" أو لغة واحدة بس) ويرجّع الجزء المناسب للغة الحالية.
 */
export function getProductName(rawName: string, lang: AppLang | string): string {
  if (!rawName) return '';

  const parts = rawName
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  // مفيش تقسيم أصلاً -> رجّع الاسم زي ما هو
  if (parts.length < 2) return rawName;

  const arabicPart = parts.find((p) => ARABIC_REGEX.test(p));
  const englishPart = parts.find((p) => !ARABIC_REGEX.test(p));

  if (lang === 'ar') {
    return arabicPart ?? rawName;
  }
  return englishPart ?? rawName;
}