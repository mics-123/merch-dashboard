export type Currency = 'USD' | 'EUR' | 'GBP' | string;

export interface SalesRow {
  date:       string;   // YYYY-MM-DD
  market:     string;
  asin:       string;
  unitsTotal: number;
  royalty:    number;
  currency:   Currency;
}

export interface AdRow {
  date:       string;
  asin:       string;
  unitsAd:    number;   // 14-Day Total Orders (#)
  adSpend:    number;
  currency:   Currency;
}

export interface CombinedRow extends SalesRow {
  unitsAd: number;
  adSpend: number;
  profit:  number | null;
}
