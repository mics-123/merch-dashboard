import Dexie, { type Table } from 'dexie';
import { type SalesRow, type AdRow } from './types';

class AmazonDB extends Dexie {
  sales!: Table<SalesRow, [string, string, string]>; // [date+market+asin]
  ads!  : Table<AdRow,   [string, string]>;          // [date+asin]

  constructor() {
    super('amazon_merch_dashboard');
    this.version(1).stores({
      sales: '++id,[date+market+asin],date,asin',
      ads:   '++id,[date+asin],date,asin',
    });
  }
}
export const db = new AmazonDB();
