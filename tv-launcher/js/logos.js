/* Recognisable brand marks as inline SVG, drawn on each app's brand colour.
   Simplified originals (not the official logo files) so they stay crisp at any size
   and carry no external assets. Keyed by the app id used in launcher.js. */
window.LOGOS = {
  'netflix':
    '<svg viewBox="0 0 48 48"><path d="M16 7h4v34h-4z" fill="#fff"/><path d="M28 7h4v34h-4z" fill="#fff"/>' +
    '<path d="M16 7h4l12 34h-4z" fill="#fff"/></svg>',

  'youtube.leanback.v4':
    '<svg viewBox="0 0 48 48"><rect x="6" y="13" width="36" height="22" rx="7" fill="#fff"/>' +
    '<path d="M21 20v8l8-4z" fill="#ff0000"/></svg>',

  'amazon':
    '<svg viewBox="0 0 48 48"><text x="24" y="24" text-anchor="middle" font-family="Arial" ' +
    'font-size="12" font-weight="700" fill="#fff">prime</text>' +
    '<path d="M11 31c8 5 18 5 26 0" stroke="#4dc8ff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M33 28l5 3-3 4" stroke="#4dc8ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  'com.disney.disneyplus-prod':
    '<svg viewBox="0 0 48 48"><text x="24" y="31" text-anchor="middle" font-family="Georgia,serif" ' +
    'font-style="italic" font-size="19" font-weight="700" fill="#fff">Disney</text>' +
    '<text x="40.5" y="21" font-family="Arial" font-size="12" fill="#fff">+</text></svg>',

  'com.apple.appletv':
    '<svg viewBox="0 0 48 48"><path d="M27 12c-0.6 2-2.4 3.6-4.2 3.4-0.3-1.9 0.7-3.9 1.8-5 1.2-1.2 3-2 4.2-1.9 0.2 1.9-0.6 3.8-1.8 3.5z" fill="#fff"/>' +
    '<path d="M31 22c-1-1.4-2.5-2.2-4-2.2-1.7 0-2.5 0.8-3.8 0.8-1.4 0-2.4-0.8-3.9-0.8-2 0-4 1.3-5 3.2-2 3.6-0.5 9 1.5 12 1 1.4 2.1 3 3.6 3 1.4 0 1.9-0.9 3.6-0.9 1.7 0 2.1 0.9 3.6 0.9 1.5 0 2.5-1.5 3.5-2.9 0.7-1 1.2-2.1 1.5-3-3.5-1.3-4-6.1-0.2-7.9z" fill="#fff"/>' +
    '<text x="24" y="44" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#fff">tv</text></svg>',

  'spotify-beehive':
    '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#fff"/>' +
    '<path d="M15 20c6-1.5 13-1 18 2" stroke="#1db954" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M16 26c5-1.2 11-0.7 15 1.8" stroke="#1db954" stroke-width="2.3" fill="none" stroke-linecap="round"/>' +
    '<path d="M17 31c4-0.9 8-0.6 11 1.3" stroke="#1db954" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',

  'cdp-30':
    '<svg viewBox="0 0 48 48"><path d="M17 10l9 14-9 14h7l9-14-9-14z" fill="#fff"/></svg>'
};
