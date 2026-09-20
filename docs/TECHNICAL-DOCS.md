# Tattoo Flash Sheet Builder V2 - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Schemas](#data-schemas)
3. [Image Processing Pipeline](#image-processing-pipeline)
4. [Internationalization (i18n) Engine](#internationalization-i18n-engine)
5. [Storage Budget & Quota Management](#storage-budget--quota-management)
6. [Print Stylesheet & Safe Margins](#print-stylesheet--safe-margins)
7. [Security & Content Security Policy](#security--content-security-policy)

---

## Architecture Overview

### Technology Stack
- **HTML5**: Semantic tags, ARIA attributes, inline SVG graphics.
- **CSS3**: CSS custom properties for theming (light/dark mode), responsive grid, `@media print` rules.
- **Vanilla JavaScript (ES6+)**: Zero runtime dependencies, no bundler needed.
- **Web APIs**: `localStorage`, `FileReader`, `<canvas>`, `HTML5 Drag and Drop API`.
- **Server**: Node.js static file server (`server.js`) using Express on port 3000.

### Directory Structure
```
flash-sheet-builder/
├── index.html            # Main application interface
├── server.js             # Plain Node.js Express server
├── package.json          # Node manifest and lint script
├── css/
│   └── style.css         # Responsive styling, theming, and print CSS
├── js/
│   ├── app.js            # Core application state, events, rendering, export
│   ├── i18n.js           # Synchronous 7-language translation dictionary
│   └── input-guards.js   # Input validation and sanitization utilities
└── docs/
    ├── USER-GUIDE.md     # Studio user guide
    └── TECHNICAL-DOCS.md # Technical documentation
```

---

## Data Schemas

### Application State Schema (`localStorage['poli_flash_sheets_v2']`)

```javascript
{
  activeSheetId: "sheet_m1234_abc",
  sheets: [
    {
      id: "sheet_m1234_abc",
      name: "Halloween Flash 2026",
      artist: "Alex Mercer",
      contact: "@mercer_tattoos",
      date: "2026-10-31",
      currency: "£",          // '£' | '$' | '€' | 'A$' | 'C$' | '¥' | 'CHF' | 'kr' | 'R$'
      paperSize: "a4",        // 'a4' | 'letter'
      gridCols: 3,            // 2 | 3 | 4
      designs: [
        {
          id: "des_x987_12",
          name: "Serpent Rose",
          style: "traditional",
          size: "palm",
          price: 120,         // number or ''
          deposit: 40,        // number or ''
          sittingTime: "1.5 hrs",
          status: "available", // 'available' | 'claimed' | 'repeatable'
          span: 1,            // 1 | 2 (centerpiece cell span)
          notes: "Forearms or calves",
          image: "data:image/jpeg;base64,..." // scaled, EXIF-stripped JPEG data URL or null
        }
      ]
    }
  ]
}
```

---

## Image Processing Pipeline

To protect privacy and prevent browser storage exhaustion:
1. **Input**: User selects or drops an image file (`image/*`).
2. **Read**: In-browser `FileReader` loads the binary stream into an `HTMLImageElement`.
3. **Downscale**: The image is rendered to an off-screen `<canvas>` with maximum bounding dimension of 700px, preserving aspect ratio.
4. **Metadata Strip**: The canvas draw call discards all EXIF headers, GPS coordinates, and camera models.
5. **Compression**: Encoded via `canvas.toDataURL('image/jpeg', 0.82)`.
6. **Storage**: Stored as a data URL in the design record in `localStorage`.

---

## Internationalization (i18n) Engine

- **Dictionary**: Synchronously loaded via `window.i18n` in `js/i18n.js`.
- **Supported Languages**: English (`en`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Portuguese (`pt`), Dutch (`nl`).
- **Key Parity**: Every supported language contains the exact same 146 translation keys with 0 missing entries.
- **Dynamic Interpolation**: `window.i18n.t(key, { token: value })` handles placeholder replacement cleanly.
- **DOM Sweep**: Elements with `data-i18n`, `data-i18n-placeholder`, and `data-i18n-title` are localized automatically upon language change.

---

## Storage Budget & Quota Management

- Standard web browsers provide ~5,000 KB (5 MB) per origin in `localStorage`.
- `calculateStorageUsage()` iterates across `localStorage` keys and computes UTF-16 byte usage.
- A visual progress meter updates with current KB and percentage.
- When utilization exceeds 75%, an inline warning prompts the user to export a JSON backup.
- Storage operations are wrapped in `try/catch` to handle `QuotaExceededError` safely without crashing the UI.

---

## Print Stylesheet & Safe Margins

- `@media print` targets standard page dimensions:
  - A4 (210mm × 297mm) or US Letter (8.5in × 11in) with 12.7mm (0.5in) margin safety zones.
- Interactive controls, navigation elements, storage meters, and modal chrome are hidden via `.no-print` and `display: none !important`.
- Cards utilize `break-inside: avoid` (and `page-break-inside: avoid`) to prevent awkward page cuts.
- Claimed pieces receive reduced opacity and grayscale filters to visually signify reservation while remaining identifiable on the sheet.

---

## Security & Content Security Policy

- **CSP Compatibility**: Zero inline event attributes (`onclick`), no `eval()`, zero external `<script>` or `<link>` tags. All scripts and stylesheets are hosted locally from relative paths.
- **No Third-Party CDNs**: No external fonts, icons, or analytics.
- **Pure Client-Side**: No user data, artwork, or pricing information is transmitted over HTTP.
