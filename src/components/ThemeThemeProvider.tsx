import Script from 'next/script';

/**
 * Applies the persisted theme before paint to prevent a flash of the wrong theme.
 * Defaults to 'dark' (cinematic streaming mode).
 */
const STORAGE_KEY = 'bakastream-theme-v10';
const LEGACY_STORAGE_KEY_V9 = 'bakastream-theme-v9';
const LEGACY_STORAGE_KEY_V8 = 'bakastream-theme-v8';
const LEGACY_STORAGE_KEY_V7 = 'bakastream-theme-v7';
const LEGACY_STORAGE_KEY_V6 = 'bakastream-theme-v6';

export default function ThemeThemeProvider() {
  const code = `(function(){try{var v=['dark','cyberpunk','solo','emerald','solar','midnight','light'];var t=localStorage.getItem('${STORAGE_KEY}')||localStorage.getItem('${LEGACY_STORAGE_KEY_V9}')||localStorage.getItem('${LEGACY_STORAGE_KEY_V8}')||localStorage.getItem('${LEGACY_STORAGE_KEY_V7}')||localStorage.getItem('${LEGACY_STORAGE_KEY_V6}');if(!t||v.indexOf(t)===-1){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

  return (
    <Script
      id="bakastream-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
