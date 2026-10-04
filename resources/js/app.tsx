import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'QR Attend';

type PageModule = { default: ComponentType };

createInertiaApp({
  title: (title) => (title ? `${title} · ${appName}` : appName),
  resolve: async (name) => {
    const pages = import.meta.glob<PageModule>('./pages/**/*.tsx');
    const page = pages[`./pages/${name}.tsx`];
    if (!page) {
      throw new Error(`Halaman tidak ditemukan: ${name}`);
    }
    return (await page()).default;
  },
  setup({ el, App, props }) {
    if (el) {
      createRoot(el).render(<App {...props} />);
    }
  },
  progress: { color: '#10B981' },
});
