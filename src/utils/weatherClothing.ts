import { AppSettings, ClothingAdviceRule } from '../types';

export const DEFAULT_CLOTHING_RAIN_THRESHOLD = 40;
export const DEFAULT_CLOTHING_RAIN_ADVICE =
  'Neem een regenjas of paraplu mee (kans op neerslag)';
export const DEFAULT_CLOTHING_WIND_THRESHOLD = 30;
export const DEFAULT_CLOTHING_WIND_ADVICE =
  'Winddicht jasje aangeraden door stevige wind';

export const DEFAULT_CLOTHING_RULES: ClothingAdviceRule[] = [
  {
    id: 'tier-freezing',
    label: 'Vrieskou (t/m 4°C)',
    maxTemp: 4,
    advice: 'Dikke winterjas, muts, sjaal & handschoenen',
    items: ['🧥 Dikke winterjas', '🧶 Warme trui', '👖 Lange broek', '🧤 Muts & sjaal']
  },
  {
    id: 'tier-cold',
    label: 'Koud (5°C – 11°C)',
    maxTemp: 11,
    advice: 'Warme jas en een trui of vest aan',
    items: ['🧥 Warme jas', '🧶 Trui / vest', '👖 Lange broek', '👟 Dichte schoenen']
  },
  {
    id: 'tier-cool',
    label: 'Fris (12°C – 17°C)',
    maxTemp: 17,
    advice: 'Tussenjas of vestje met lange mouwen',
    items: ['🧥 Tussenjas / vest', '👕 Longsleeve', '👖 Lange broek', '👟 Sneakers']
  },
  {
    id: 'tier-mild',
    label: 'Aangenaam (18°C – 22°C)',
    maxTemp: 22,
    advice: "T-shirt met een licht vestje voor 's morgens",
    items: ['👕 T-shirt', '🧥 Licht vestje', '👖 Dunne broek / rok', '👟 Sneakers']
  },
  {
    id: 'tier-warm',
    label: 'Warm (23°C en warmer)',
    maxTemp: 99,
    advice: 'Luchtige zomerkleding, korte broek & zonnebescherming',
    items: ['👕 T-shirt / hemdje', '🩳 Korte broek / jurk', '🧢 Pet & zonnecrème', '👡 Lichte schoenen']
  }
];

export function isRainyWeatherCode(code?: number): boolean {
  if (code == null) return false;
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

export function isSnowWeatherCode(code?: number): boolean {
  if (code == null) return false;
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

export interface ComputedClothingAdvice {
  referenceTemp: number;
  tempMin?: number;
  tempMax?: number;
  matchedRule: ClothingAdviceRule;
  headline: string;
  items: string[];
  extras: string[];
  hasRainAlert: boolean;
  hasWindAlert: boolean;
  customNote: string;
}

export function getClothingAdvice(settings: AppSettings): ComputedClothingAdvice {
  const rules =
    Array.isArray(settings.clothingRules) && settings.clothingRules.length > 0
      ? [...settings.clothingRules].sort((a, b) => a.maxTemp - b.maxTemp)
      : DEFAULT_CLOTHING_RULES;

  const tempMax = settings.weatherTempMax;
  const tempMin = settings.weatherTempMin;
  const currentTemp = settings.weatherTemp ?? 18;
  // Use daytime max when available so morning cold doesn't mask a warm afternoon,
  // or fall back to current temperature.
  const referenceTemp = tempMax != null ? tempMax : currentTemp;

  const matchedRule =
    rules.find(r => referenceTemp <= r.maxTemp) || rules[rules.length - 1];

  const items = [...(matchedRule.items || [])];
  const extras: string[] = [];

  const rainThreshold = settings.clothingRainThreshold ?? DEFAULT_CLOTHING_RAIN_THRESHOLD;
  const rainProb = settings.weatherPrecipitationProb ?? 0;
  const dailyCode = settings.weatherDailyCode ?? settings.weatherCode;
  const hasRainAlert =
    rainProb >= rainThreshold || isRainyWeatherCode(dailyCode) || isRainyWeatherCode(settings.weatherCode);

  if (hasRainAlert) {
    const rainText = (settings.clothingRainAdvice || DEFAULT_CLOTHING_RAIN_ADVICE).trim();
    if (rainText) extras.push(`☔ ${rainText}`);
    if (!items.some(i => i.toLowerCase().includes('regen'))) {
      items.push('☔ Regenjas / paraplu');
    }
  }

  if (isSnowWeatherCode(dailyCode) || isSnowWeatherCode(settings.weatherCode)) {
    extras.push('❄️ Kans op sneeuw of gladheid: warme waterdichte schoenen');
  }

  const windThreshold = settings.clothingWindThreshold ?? DEFAULT_CLOTHING_WIND_THRESHOLD;
  const windMax = settings.weatherWindMax ?? 0;
  const hasWindAlert = windMax >= windThreshold;
  if (hasWindAlert) {
    const windText = (settings.clothingWindAdvice || DEFAULT_CLOTHING_WIND_ADVICE).trim();
    if (windText) extras.push(`💨 ${windText}`);
  }

  // Morning chill layer hint when big morning-afternoon swing
  if (tempMin != null && tempMax != null && tempMin <= 10 && tempMax >= 17) {
    extras.push(`🧣 Frisse start (${tempMin}°C) → kleed in laagjes voor vanmiddag (${tempMax}°C)`);
  }

  return {
    referenceTemp,
    tempMin,
    tempMax,
    matchedRule,
    headline: matchedRule.advice,
    items,
    extras,
    hasRainAlert,
    hasWindAlert,
    customNote: (settings.clothingCustomNote || '').trim()
  };
}
