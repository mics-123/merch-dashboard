// src/App.tsx
import { useCallback, useState } from 'react';
import DropZone     from './components/DropZone';
import Dashboard    from './components/Dashboard';
import ImportWorker from './workers/import.ts?worker';

export default function App() {
  // Zähler, damit Dashboard nach jedem erfolgreichen Import neu fetched
  const [importVersion, setImportVersion] = useState(0);

  /** startet für jede Datei einen neuen Web‐Worker */
  const importFiles = useCallback((files: FileList | File[]) => {
    [...files].forEach(file => {
      console.log('⚙️ Spawning worker for', file.name);
      const worker = new ImportWorker();

      worker.postMessage(file);

      worker.onmessage = ev => {
        console.log('✅ import', ev.data);
        // trigger für den Dashboard‐Live‐Query
        setImportVersion(v => v + 1);
        worker.terminate();
      };

      worker.onerror = err => {
        console.error('❌ Worker error', err);
        worker.terminate();
      };
    });
  }, []);

  return (
    <div className="p-4 min-w-[700px]">
      <h1 className="text-2xl font-bold mb-4">Amazon Merch Dashboard</h1>

      {/* Drag-&-Drop für Sales-/Ad-Reports */}
      <DropZone onFiles={importFiles} />

      {/* KPI-Leiste + Tabelle, wird neu gerendert bei importVersion */}
      <Dashboard importVersion={importVersion} />
    </div>
  );
}
