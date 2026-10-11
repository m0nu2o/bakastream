import Script from 'next/script';

/**
 * Applies the persisted theme before paint to prevent a flash of the wrong
 * theme. Rendered inside <head> from the root layout.
 */
const STORAGE_KEY = 'bakastream-theme';
const LEGACY_STORAGE_KEY = 'skystream-theme';

export default function ThemeThemeProvider() {
  const code = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||localStorage.getItem('${LEGACY_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

  return (
    <Script
      id="bakastream-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
