# Tattoo Flash Sheet Builder V2

> **Layout, price, and print studio flash sheets and counter price lists with your own artwork. Everything stays inside the browser.**

[![License](https://img.shields.io/github/license/Poli-International/flash-sheet-builder)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/Poli-International/flash-sheet-builder)](https://github.com/Poli-International/flash-sheet-builder/commits/main)
[![GitHub Stars](https://img.shields.io/github/stars/Poli-International/flash-sheet-builder?style=social)](https://github.com/Poli-International/flash-sheet-builder/stargazers)

**Live Website:** [https://poliinternational.com/tools/flash-sheet-builder/](https://poliinternational.com/tools/flash-sheet-builder/)

---

## Overview

The Tattoo Flash Sheet Builder is a free client-side tool from [Poli International](https://poliinternational.com/) for tattoo artists and studios. It lays out an artist's flash designs on a printable sheet with custom sizes, prices, deposits, and availability tracking.

All artwork, pricing, and sheets remain strictly on the user's device in local storage. Nothing is uploaded to any remote server.

---

## Features

- **Artist's Own Artwork**: Attach flash design photos directly from your phone or desktop. Images are automatically auto-oriented, downscaled, stripped of all EXIF/GPS metadata, and compressed on an off-screen canvas.
- **Print-Ready Sheet Layouts**: Formatted for A4 or US Letter paper with safe margins and studio identity details (title, artist, contact, date).
- **Counter Price List Layout**: Text-only pricing sheet formatted for studio reception counters.
- **Multiple Named Sheets**: Manage separate sheets for flash days, events, and guest spots. Export and import full `.json` backups.
- **Any Currency**: Select your studio's currency (£, $, €, A$, C$, ¥, CHF, kr, R$). Prices and deposits are formatted with the chosen symbol without currency conversion.
- **Availability States**: Mark designs as Available (one-off), Claimed (one-off taken, greyed out on print sheet), or Repeatable (multiple tattoos permitted).
- **Flexible Arrangement**: Toggle between a fast tabular view and a visual drag-and-drop card grid. Set focal pieces to span 2 grid cells wide.
- **CSV Export**: Export sheet inventory to spreadsheet-ready `.csv` format.
- **Storage Budget Meter**: Live monitor tracking local storage usage with a warning threshold at 75%.
- **Multilingual Support**: Fully localized in English, Spanish, French, German, Italian, Portuguese, and Dutch.

---

## Running Locally

This tool requires Node.js (>=20) with no compilation build step required:

```bash
# Clone the repository
git clone https://github.com/Poli-International/flash-sheet-builder.git
cd flash-sheet-builder

# Install server dependency
npm install

# Start local server on port 3000
npm start
```

Visit `http://localhost:3000` in your web browser.

---

## Embedding

To embed this tool on your studio website, use the following snippet:

```html
<iframe src="https://poliinternational.com/tools/flash-sheet-builder/index.html" width="100%" height="800" frameborder="0" loading="lazy"></iframe>
```

---

## Documentation

- [User Guide](docs/USER-GUIDE.md) - Detailed usage instructions for studio owners and artists.
- [Technical Documentation](docs/TECHNICAL-DOCS.md) - Architecture, data schemas, image pipeline, and print specifications.

---

## License

MIT License - see [LICENSE](LICENSE) for details.
