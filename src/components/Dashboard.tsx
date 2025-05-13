// src/components/Dashboard.tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { type CombinedRow } from '../types';

interface DashboardProps {
  importVersion: number;
}

export default function Dashboard({ importVersion }: DashboardProps) {
  const rows = useLiveQuery(
    async () => {
      const sales = await db.sales.toArray();
      const ads   = await db.ads.toArray();

      const map = new Map<string, CombinedRow>();
      sales.forEach(s => {
        map.set(`${s.date}|${s.asin}`, { ...s, unitsAd: 0, adSpend: 0, profit: null });
      });
      ads.forEach(a => {
        const key = `${a.date}|${a.asin}`;
        const row = map.get(key) ?? { ...a, unitsTotal: 0, royalty: 0, profit: null };
        row.unitsAd   = a.unitsAd;
        row.adSpend   = a.adSpend;
        if (row.currency === a.currency) row.profit = +(row.royalty - a.adSpend).toFixed(2);
        map.set(key, row as CombinedRow);
      });
      return [...map.values()];
    },
    // hier sorgt importVersion dafür, dass liveQuery bei jedem Import-Version-Wechsel neu abfragt
    [importVersion]
  );

  if (!rows) return <p className="mt-4">Lade …</p>;

  const totals = rows.reduce(
    (a, r) => {
      a.royalty += r.royalty;
      a.spend   += r.adSpend;
      return a;
    },
    { royalty: 0, spend: 0 }
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 my-4">
        <Kpi label="Royalty"   value={totals.royalty} />
        <Kpi label="Ad Spend"  value={totals.spend} />
      </div>
      <div className="overflow-auto max-h-[60vh]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-200">
            <tr>
              {['Date','ASIN','Units','Units Ad','Royalty','Spend','Profit'].map(h => (
                <th key={h} className="p-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${r.date}|${r.asin}`} className="odd:bg-gray-50">
                <td className="p-2">{r.date}</td>
                <td>{r.asin}</td>
                <td className="text-right">{r.unitsTotal}</td>
                <td className="text-right">{r.unitsAd}</td>
                <td className="text-right">{r.royalty.toFixed(2)}</td>
                <td className="text-right">{r.adSpend.toFixed(2)}</td>
                <td className="text-right">{r.profit?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-xl font-bold">{value.toFixed(2)}</p>
    </div>
  );
}
