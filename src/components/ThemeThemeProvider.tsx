import Script from 'next/script';

/**
 * Applies the persisted theme and light/dark mode before paint to prevent any flash of the wrong appearance.
 * Defaults to 'dark' mode and 'dark' (Sakura Crimson) theme.
 */
const STORAGE_THEME_KEY = 'bakastream-theme-v11';
const STORAGE_MODE_KEY = 'bakastream-mode-v11';
const LEGACY_STORAGE_V10 = 'bakastream-theme-v10';
const LEGACY_STORAGE_V9 = 'bakastream-theme-v9';

export default function ThemeThemeProvider() {
  const code = `(function(){try{
    var v=['dark','cyberpunk','solo','emerald','solar','midnight'];
    var t=localStorage.getItem('${STORAGE_THEME_KEY}')||localStorage.getItem('${LEGACY_STORAGE_V10}')||localStorage.getItem('${LEGACY_STORAGE_V9}')||'dark';
    var m=localStorage.getItem('${STORAGE_MODE_KEY}')||'dark';
    if(t==='light'){t='dark';m='light';}
    if(v.indexOf(t)===-1){t='dark';}
    if(m!=='light'&&m!=='dark'){m='dark';}
    document.documentElement.setAttribute('data-theme',t);
    document.documentElement.setAttribute('data-mode',m);
  }catch(e){
    document.documentElement.setAttribute('data-theme','dark');
    document.documentElement.setAttribute('data-mode','dark');
  }})();`;

  return (
    <Script
      id="bakastream-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
