import sharp from 'sharp';
import fs from 'fs';

// 1. Sleek square emblem SVG (for app icon, favicon, PWA)
const emblemSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#151522" />
      <stop offset="100%" stop-color="#0b0b12" />
    </linearGradient>
    <linearGradient id="neonGrad" x1="80" y1="80" x2="432" y2="432" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff4b5c" />
      <stop offset="50%" stop-color="#f43b4c" />
      <stop offset="100%" stop-color="#b81d2f" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="160" y1="140" x2="360" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#fca5a5" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect x="8" y="8" width="496" height="496" rx="120" stroke="url(#neonGrad)" stroke-width="6" stroke-opacity="0.3" fill="none" />

  <!-- Outer dynamic play shield ring -->
  <path d="M190 130 C 190 115, 206 106, 219 114 L 380 234 C 392 243, 392 261, 380 270 L 219 390 C 206 398, 190 389, 190 374 Z" 
        fill="url(#neonGrad)" filter="url(#glow)" />

  <!-- Inner sleek play cut -->
  <path d="M226 182 C 226 172, 237 166, 245 172 L 340 246 C 348 252, 348 262, 340 268 L 245 342 C 237 348, 226 342, 226 332 Z" 
        fill="url(#accentGrad)" />

  <!-- Anime lightning/spark accent -->
  <path d="M150 200 L 175 256 L 140 262 L 185 330 L 165 272 L 200 268 Z" fill="#ffffff" opacity="0.9" />
</svg>
`;

// 2. Horizontal logo SVG (Emblem + "BakaStream" text)
const horizontalLogoSvg = `
<svg width="600" height="150" viewBox="0 0 600 150" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="neonGradH" x1="30" y1="30" x2="130" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff4b5c" />
      <stop offset="50%" stop-color="#f43b4c" />
      <stop offset="100%" stop-color="#b81d2f" />
    </linearGradient>
    <linearGradient id="textGrad" x1="160" y1="0" x2="350" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff4b5c" />
      <stop offset="100%" stop-color="#f43b4c" />
    </linearGradient>
    <filter id="glowH" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Emblem Icon -->
  <g transform="translate(15, 15) scale(0.234)">
    <rect width="512" height="512" rx="128" fill="#151522" />
    <path d="M190 130 C 190 115, 206 106, 219 114 L 380 234 C 392 243, 392 261, 380 270 L 219 390 C 206 398, 190 389, 190 374 Z" 
          fill="url(#neonGradH)" filter="url(#glowH)" />
    <path d="M226 182 C 226 172, 237 166, 245 172 L 340 246 C 348 252, 348 262, 340 268 L 245 342 C 237 348, 226 342, 226 332 Z" 
          fill="#ffffff" />
    <path d="M150 200 L 175 256 L 140 262 L 185 330 L 165 272 L 200 268 Z" fill="#ffffff" opacity="0.9" />
  </g>

  <!-- Text: "BakaStream" -->
  <text x="160" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="62" letter-spacing="-1.5">
    <tspan fill="url(#textGrad)">Baka</tspan><tspan fill="#ffffff">Stream</tspan>
  </text>
  <text x="500" y="55" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" fill="#f43b4c" opacity="0.9">
    HD
  </text>
</svg>
`;

// 3. Social / OpenGraph Banner (1200x630)
const ogBannerSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogBg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#12121e" />
      <stop offset="60%" stop-color="#0b0b12" />
      <stop offset="100%" stop-color="#1a0b12" />
    </linearGradient>
    <radialGradient id="ogGlow" cx="600" cy="240" r="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f43b4c" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#f43b4c" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="ogTextGrad" x1="0" y1="0" x2="350" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff4b5c" />
      <stop offset="100%" stop-color="#f43b4c" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#ogBg)" />
  <circle cx="600" cy="240" r="450" fill="url(#ogGlow)" />

  <!-- Big Central Icon -->
  <g transform="translate(480, 100) scale(0.468)">
    <rect width="512" height="512" rx="128" fill="#181828" stroke="#f43b4c" stroke-width="6" />
    <path d="M190 130 C 190 115, 206 106, 219 114 L 380 234 C 392 243, 392 261, 380 270 L 219 390 C 206 398, 190 389, 190 374 Z" 
          fill="#f43b4c" />
    <path d="M226 182 C 226 172, 237 166, 245 172 L 340 246 C 348 252, 348 262, 340 268 L 245 342 C 237 348, 226 342, 226 332 Z" 
          fill="#ffffff" />
    <path d="M150 200 L 175 256 L 140 262 L 185 330 L 165 272 L 200 268 Z" fill="#ffffff" opacity="0.9" />
  </g>

  <!-- Big Text -->
  <text x="600" y="420" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="88" letter-spacing="-2">
    <tspan fill="#f43b4c">Baka</tspan><tspan fill="#ffffff">Stream</tspan>
  </text>

  <!-- Subtitle -->
  <text x="600" y="485" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="28" fill="#94a3b8" letter-spacing="0.5">
    Watch Movies, Anime, TV Shows &amp; Hindi Serials Online in HD
  </text>

  <!-- Badges row -->
  <text x="600" y="540" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="#f43b4c">
    🇮🇳 Multilingual Audio  •  🇯🇵 Anime Sub/Dub  •  ⚡ Ad-Shield Protected
  </text>
</svg>
`;

async function build() {
  console.log('Rendering modern BakaStream brand assets with sharp...');

  // 1. LOGO.png (Horizontal logo, 600x150)
  await sharp(Buffer.from(horizontalLogoSvg))
    .png()
    .toFile('public/LOGO.png');
  console.log('✅ Created public/LOGO.png');

  // 2. icon-512.png
  await sharp(Buffer.from(emblemSvg))
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('✅ Created public/icon-512.png');

  // 3. icon-512-maskable.png
  await sharp(Buffer.from(emblemSvg))
    .resize(512, 512)
    .png()
    .toFile('public/icon-512-maskable.png');
  console.log('✅ Created public/icon-512-maskable.png');

  // 4. icon-192.png
  await sharp(Buffer.from(emblemSvg))
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('✅ Created public/icon-192.png');

  // 5. icon-192-maskable.png
  await sharp(Buffer.from(emblemSvg))
    .resize(192, 192)
    .png()
    .toFile('public/icon-192-maskable.png');
  console.log('✅ Created public/icon-192-maskable.png');

  // 6. apple-touch-icon.png (180x180)
  await sharp(Buffer.from(emblemSvg))
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✅ Created public/apple-touch-icon.png');

  // 7. favicon.png (32x32)
  await sharp(Buffer.from(emblemSvg))
    .resize(32, 32)
    .png()
    .toFile('public/favicon.png');
  console.log('✅ Created public/favicon.png');

  // 8. favicon.ico (converted to PNG buffer then written)
  await sharp(Buffer.from(emblemSvg))
    .resize(32, 32)
    .png()
    .toFile('public/favicon.ico');
  console.log('✅ Created public/favicon.ico');

  // 9. og-image.png (1200x630)
  await sharp(Buffer.from(ogBannerSvg))
    .resize(1200, 630)
    .png()
    .toFile('public/og-image.png');
  console.log('✅ Created public/og-image.png');

  console.log('🎉 All BakaStream brand assets generated successfully!');
}

build().catch(err => {
  console.error('Failed to generate brand assets:', err);
  process.exit(1);
});
