import Script from 'next/script';

/**
 * Applies the persisted theme before paint to prevent a flash of the wrong
 * theme. Rendered inside <head> from the root layout.
 * Supports all 8 themes: light, dark, midnight, cyberpunk, emerald, ocean, amber, sakura.
 */
const STORAGE_KEY = 'bakastream-theme-v6';
const LEGACY_STORAGE_KEY_V5 = 'bakastream-theme-v5';
const OLD_STORAGE_KEY = 'bakastream-theme';

export default function ThemeThemeProvider() {
  const code = `(function(){try{var v=['light','dark','midnight','cyberpunk','emerald','ocean','amber','sakura'];var t=localStorage.getItem('${STORAGE_KEY}')||localStorage.getItem('${LEGACY_STORAGE_KEY_V5}')||localStorage.getItem('${OLD_STORAGE_KEY}');if(!t||v.indexOf(t)===-1){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

  return (
    <Script
      id="bakastream-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
