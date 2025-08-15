export type Currency = 'COP' | 'MXN' | 'EUR' | 'USD';

export type PlanLegacy = {
  id: string;
  name: string;
  name_en?: string | null;
  provider: string;
  category: string;
  country: 'CO' | 'MX';
  base_price?: number | null;
  currency?: Currency | null;
  website?: string | null; // legacy external link
  brochure?: string | null; // may be absent
  benefits?: string[];
  benefits_en?: string[];
  tags?: string[];
  _schema: 'legacy';
};

export type PlanV2 = {
  id: string;
  name: string;
  name_en: string;
  provider: string;
  category: string; // controlled list from ETL
  country: 'CO' | 'MX';
  base_price: number; // guaranteed > 0
  currency: Currency; // COP | MXN | EUR | USD
  external_link: string; // required
  brochure_link?: string | null;
  benefits: string[];
  benefits_en: string[];
  tags: string[];
  _schema: 'v2';
};

export type AnyPlan = PlanLegacy | PlanV2;


