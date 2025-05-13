// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';

export default defineConfig(({ command }) => {
  const dev = command === 'serve';

  return {
    // für npm run dev --host
    server: dev
      ? {
          host: true,
          cors: true
        }
      : undefined,

    plugins: [
      react(),
      crx({
        manifest: {
          manifest_version: 3,
          name: 'Merch Dashboard',
          version: '0.0.1',
          action: { default_popup: 'index.html' },
          permissions: ['storage'],

          // nur im Dev-Modus host_permissions + web_accessible_resources einfügen
          ...(dev
            ? {
                host_permissions: ['http://localhost:5173/*'],
                web_accessible_resources: [
                  {
                    resources: ['service-worker-loader.js'],
                    matches: ['http://localhost:5173/*']
                  }
                ]
              }
            : {})
        }
      })
    ]
  };
});
