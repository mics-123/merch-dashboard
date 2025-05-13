/// <reference lib="webworker" />

import * as XLSX from 'xlsx';
import { parse, type ParseResult } from 'papaparse';
import { db } from '../db';
import { type SalesRow, type AdRow } from '../types';
import dayjs from 'dayjs';

/* ---------- Roh-Typen für Parsing ---------- */
interface RawSalesCsv {
  Date:       string;
  Mkt?:       string;
  Market?:    string;
  ASIN:       string;
  Purchased?: string | number;
  Royalties?: string | number;
  Currency:   string;
}

interface RawAdXlsx {
  Date:                       string;
  'Advertised ASIN'?:         string;
  Advertised_ASIN?:           string;
  '14 Day Total Orders (#)':  string | number;
  Spend:                      string | number;
  Currency:                   string;
}

/* ---------- Hilfsfunktionen ---------- */
const norm = (d: string) => dayjs(d).format('YYYY-MM-DD');

function aggregateSales(rows: RawSalesCsv[]): SalesRow[] {
  const map = new Map<string, SalesRow>();
  for (const r of rows) {
    const key = `${norm(r.Date)}|${r.Mkt ?? r.Market}|${r.ASIN}`;
    const base = map.get(key) ?? {
      date:       norm(r.Date),
      market:     r.Mkt ?? r.Market ?? '',
      asin:       r.ASIN,
      unitsTotal: 0,
      royalty:    0,
      currency:   r.Currency,
    };
    base.unitsTotal += Number(r.Purchased) || 0;
    base.royalty    += Number(r.Royalties) || 0;
    map.set(key, base);
  }
  return Array.from(map.values());
}

function aggregateAds(rows: RawAdXlsx[]): AdRow[] {
  const map = new Map<string, AdRow>();
  for (const r of rows) {
    const asin = r['Advertised ASIN'] ?? r.Advertised_ASIN ?? '';
    const key  = `${norm(r.Date)}|${asin}`;
    const base = map.get(key) ?? {
      date:    norm(r.Date),
      asin,
      unitsAd: 0,
      adSpend: 0,
      currency: r.Currency,
    };
    base.unitsAd += Number(r['14 Day Total Orders (#)']) || 0;
    base.adSpend += Number(String(r.Spend).replace(/[^0-9.]/g, '')) || 0;
    map.set(key, base);
  }
  return Array.from(map.values());
}

/* ---------- Worker-Einstiegspunkt ---------- */
self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  if (!file) return;

  // --- vereinfachter XLSX-Pfad (kein Chunking) ---
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    try {
      // 1) ArrayBuffer aus Datei
      const buf = await file.arrayBuffer();
      // 2) Workbook lesen
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // 3) kompletten Sheet-Inhalt als JSON
      const json = XLSX.utils.sheet_to_json<RawAdXlsx>(sheet, { defval: '' });
      console.log('🧐 RAW XLSX rows[0] keys:', Object.keys(json[0]));

      // 4) aggregieren
      const ads = aggregateAds(json);
      console.log(`📊 aggregated ${ads.length} ad-rows`);

      // 5) speichern und warten
      await db.ads.bulkPut(ads);

      // 6) finale Nachricht
      (self as DedicatedWorkerGlobalScope).postMessage({
        ok:    true,
        type:  'ads',
        count: ads.length
      });
    } catch (err: unknown) {
      (self as DedicatedWorkerGlobalScope).postMessage({
        ok:    false,
        error: String(err)
      });
    } finally {
      (self as DedicatedWorkerGlobalScope).close();
    }
    return;
  }

  // --- bestehendes Chunking für Sales-CSV ---
  try {
    const text = await file.text();
    let totalSales = 0;
    const putPromises: Promise<Array<string | number>>[] = [];

    parse<RawSalesCsv>(text, {
      header:         true,
      skipEmptyLines: true,
      chunkSize:      1024 * 512,
      chunk({ data }: ParseResult<RawSalesCsv>) {
        const sales = aggregateSales(data);
        totalSales += sales.length;
        putPromises.push(db.sales.bulkPut(sales));

        (self as DedicatedWorkerGlobalScope).postMessage({
          ok:    true,
          type:  'sales-chunk',
          count: totalSales
        });
      },
      complete: async () => {
        await Promise.all(putPromises);
        (self as DedicatedWorkerGlobalScope).postMessage({
          ok:    true,
          type:  'sales',
          count: totalSales
        });
        (self as DedicatedWorkerGlobalScope).close();
      },
      error(err: Error) {
        (self as DedicatedWorkerGlobalScope).postMessage({
          ok:    false,
          error: err.message
        });
        (self as DedicatedWorkerGlobalScope).close();
      }
    });
  } catch (err: unknown) {
    (self as DedicatedWorkerGlobalScope).postMessage({
      ok:    false,
      error: String(err)
    });
    (self as DedicatedWorkerGlobalScope).close();
  }
};
