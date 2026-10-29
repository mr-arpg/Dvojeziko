const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const publicDir = path.resolve(__dirname, '../public');
const svgPath = path.join(publicDir, 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Standard icon sizes
const renderIcon = (svg, width, height) => {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 1,
  });
  const pngData = resvg.render();
  return pngData.asPng();
};

// 1. Regular 512x512
const png512 = renderIcon(svgContent, 512, 512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
console.log('✓ Created pwa-512x512.png');

// 2. Regular 192x192
const png192 = renderIcon(svgContent, 192, 192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
console.log('✓ Created pwa-192x192.png');

// 3. Apple Touch Icon 180x180
const png180 = renderIcon(svgContent, 180, 180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
console.log('✓ Created apple-touch-icon.png');

// 4. Favicon 64x64
const png64 = renderIcon(svgContent, 64, 64);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), png64);
console.log('✓ Created favicon.png');

// 5. Maskable icon: Needs full bleed background (no outer squircle clip) and artwork scaled within safe zone (80%)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="45%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    <radialGradient id="skyGlow" cx="50%" cy="35%" r="50%">
      <stop offset="0%" stop-color="#5eead4" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#0d9488" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#047857" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="peakLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="peakRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>
    <linearGradient id="mountainBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#134e4a" />
      <stop offset="100%" stop-color="#042f2e" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <radialGradient id="starAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#022c22" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Full bleed background for adaptive maskable icon -->
  <rect width="512" height="512" fill="url(#bgGrad)" />
  <circle cx="256" cy="230" r="230" fill="url(#skyGlow)" />

  <!-- Scaled artwork inside 80% safe zone (center: 256, 256, scale: 0.8) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <g filter="url(#softShadow)">
      <path d="M 64 416 L 150 286 L 206 332 L 256 220 L 306 332 L 362 286 L 448 416 Z" fill="url(#mountainBaseGrad)" />
      <polygon points="166,236 100,390 178,390" fill="url(#peakLeftGrad)" />
      <polygon points="256,172 178,390 256,390" fill="#ffffff" />
      <polygon points="346,236 304,390 346,390" fill="url(#peakLeftGrad)" />
      <polygon points="166,236 178,390 206,310" fill="url(#peakRightGrad)" />
      <polygon points="256,172 256,390 304,390" fill="#94a3b8" />
      <polygon points="346,236 346,390 412,390" fill="url(#peakRightGrad)" />
      <polygon points="256,172 232,228 256,238 274,220" fill="#ffffff" />
      <polygon points="256,172 256,238 274,220" fill="#e2e8f0" />
      <polygon points="166,236 148,276 174,272" fill="#ffffff" />
      <polygon points="346,236 332,274 360,274" fill="#cbd5e1" />

      <g transform="translate(0, 16)">
        <rect x="136" y="324" width="240" height="84" rx="42" fill="#ffffff" />
        <path d="M 180 404 L 160 436 L 210 406 Z" fill="#ffffff" />
        <circle cx="196" cy="366" r="14" fill="#059669" />
        <circle cx="256" cy="366" r="14" fill="#0d9488" />
        <circle cx="316" cy="366" r="14" fill="#2563eb" />
      </g>

      <circle cx="256" cy="116" r="42" fill="url(#starAura)" />
      <g transform="translate(256, 116)">
        <polygon points="0,-26 7,-9 24,-13 14,2 24,16 7,12 0,28 -7,12 -24,16 -14,2 -24,-13 -7,-9" fill="url(#goldGrad)" />
        <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
      </g>

      <path d="M 112 448 C 160 442, 200 454, 256 448 C 312 442, 352 454, 400 448" fill="none" stroke="#5eead4" stroke-width="4.5" stroke-linecap="round" opacity="0.6" />
      <path d="M 148 464 C 188 460, 224 468, 256 464 C 288 460, 324 468, 364 464" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.4" />
    </g>
  </g>
</svg>`;

const pngMaskable512 = renderIcon(maskableSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);
console.log('✓ Created pwa-maskable-512x512.png');
