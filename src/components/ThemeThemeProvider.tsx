import Script from 'next/script';

/**
 * Applies the persisted theme before paint to prevent a flash of the wrong theme.
 * Defaults to 'dark' (cinematic streaming mode).
 */
const STORAGE_KEY = 'bakastream-theme-v7';
const LEGACY_STORAGE_KEY_V6 = 'bakastream-theme-v6';

export default function ThemeThemeProvider() {
  const code = `(function(){try{var v=['dark','midnight','light'];var t=localStorage.getItem('${STORAGE_KEY}')||localStorage.getItem('${LEGACY_STORAGE_KEY_V6}');if(!t||v.indexOf(t)===-1){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

  return (
    <Script
      id="bakastream-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
