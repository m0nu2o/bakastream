import Script from 'next/script';

/**
 * Applies the persisted theme before paint to prevent a flash of the wrong
 * theme. Rendered inside <head> from the root layout.
 */
const STORAGE_KEY = 'bakastream-theme-v5';
const LEGACY_STORAGE_KEY = 'bakastream-theme';

export default function ThemeThemeProvider() {
  const code = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

  return (
    <Script
      id="bakastream-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
