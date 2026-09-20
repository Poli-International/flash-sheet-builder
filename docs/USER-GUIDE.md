# Tattoo Flash Sheet Builder: user guide

The Tattoo Flash Sheet Builder is an in-browser layout and pricing tool that helps tattoo artists and studio owners turn flash artwork, prices, and booking details into printable sheets and counter price lists.

## What it is for

The tool formats tattoo flash designs into printable sheets for studio display and front-desk consultations. Artists can set prices, deposits, sizing notes, sitting times, and availability states without graphic design software. Studios can generate an illustrated artwork grid for display binders and an itemized counter price list for reception staff.

## Who it is for

This tool is built for independent tattoo artists, resident studio tattooists, guest artists, and studio managers. It is designed for shop binders, flash days, and promotions where fast presentation and pricing clarity are needed.

## How to use it

### Checking the browser storage budget

1. Monitor local storage on the `Browser Storage Budget` meter at the top of the page.
2. If storage exceeds 75 percent, heed the alert: `Browser storage is over 75% full. Consider exporting a backup or clearing unused sheets.`.
3. Export a backup before adding photo scans so your browser memory does not fill up.

### Managing sheets and backups

1. Select a sheet in `Active Sheet:` to switch projects.
2. Click `+ New Sheet` to add a sheet, `Duplicate` to clone it, or `Delete` to remove it.
3. Click `Export Backup` to download a JSON file, or click `Import Backup` to restore it.

### Configuring sheet settings and studio identity

1. Open `Sheet Settings & Identity` to update your sheet details.
2. Enter `Sheet Title`, `Artist / Studio Name`, `Contact / Instagram`, and `Sheet Date`.
3. Select your `Currency`, set `Paper Format` to `A4 (210 × 297 mm)` or `US Letter (8.5 × 11 in)`, and set `Grid Columns` to `2 Columns`, `3 Columns`, or `4 Columns`.

### Adding and editing flash designs

1. In `Add Flash Design`, add artwork under `Design Artwork (Optional - stays on device only)` using `Click or drag & drop design photo`, or use `Change` or `Remove`.
2. Enter `Design Name *`, pick `Style` and `Size`, and input `Price` and `Deposit` (or leave blank for POA).
3. Enter `Est. Sitting Time`, and set `Availability Status` to `Available (Unclaimed one-off)`, `Claimed (One-off taken)`, or `Repeatable (Multiple tattoos permitted)`.
4. Check `Centerpiece: take 2 grid cells wide` for wide pieces, and add notes in `Notes / Placement`.
5. Click `Add to Flash Sheet` to save, or use `Update Design` or `Cancel Edit` when editing.

### Reviewing designs in Table View

1. Under `Sheet Designs`, select `Table View` to inspect your inventory.
2. Check the summary strip for counts, availability, and total value.
3. Click `Claim` on any row to mark a piece taken, or click `Make Available` to reopen it.
4. Click `Edit` to modify a design, `Delete` to remove it, or `Clear All` to wipe the sheet.

### Arranging sheet layouts with Drag to Arrange

1. Select `Drag to Arrange` above the designs list.
2. Follow the prompt: `Drag cards to arrange your sheet layout before printing.`.
3. Drag cards by their handle to arrange focal and complementary designs.

### Exporting spreadsheet data

1. Click `Export CSV` above the designs list.
2. Save the CSV file to your computer.
3. Open the file in spreadsheet software to review inventory, deposits, or sales.

### Printing flash sheets and counter price lists

1. Click `Preview & Print Flash Sheet` to preview the visual grid.
2. Alternatively, click `Print Counter Price List` for an itemized table.
3. In the `Print & PDF Export` modal, switch between `Flash Sheet` and `Counter Price List`.
4. Click `Print / Save as PDF` to launch the print dialog.
5. Click `Close` to dismiss the preview.

## What it does not do

The tool is an in-browser layout and price sheet creator. It intentionally excludes administrative functions handled by other specialized tools:

- It does not calculate hourly chair overheads or benchmark studio rates. To analyze studio costs and regional pricing, use the [Studio Pricing Benchmark](https://poliinternational.com/studio-pricing-benchmark/).
- It does not create legal release waivers, medical questionnaires, or digital signatures. To generate consent forms and intake paperwork, use the [Consent Form Builder](https://poliinternational.com/consent-form-generator/).
- It does not process card payments or collect booking deposits online. Deposits are taken in person or through your studio card reader.
- It does not run an online booking calendar or send appointment notifications.

## Where your data lives

All flash designs, prices, notes, and compressed photos live entirely inside your local web browser on your computer or phone. No artwork, contact handles, or financial figures are sent across the network or stored on remote servers.

Clearing site cookies and data, resetting browser history, or using private browsing windows will erase your stored sheets. Export a backup regularly to keep your collections safe.

The backup file is a JSON document containing:
- Sheet settings (titles, artist names, contact handles, dates, currencies, paper formats, and column counts).
- Design entries (names, styles, sizes, prices, deposits, times, statuses, spans, and notes).
- Compressed image data for attached artwork.

## Printing and exporting

The print output is formatted for physical studio use:
- Paper sizing: Match your printer settings to the paper size chosen in the tool (A4 or US Letter).
- Print margins: The preview displays a dashed margin outline marking the 0.5 inch (12.7 mm) safety zone. Choose default or minimum margins in your print dialog.
- Headers and footers: Uncheck "Headers and footers" in your print prompt to remove URLs and timestamps from borders.
- Background graphics: Check "Background graphics" in your print options so status badges, table borders, and card shading print correctly.
- Monochrome printing: Layouts use strong contrast and clean lines, suitable for black-and-white laser printers, copiers, or thermal stencil copiers.

## Questions and answers

### How do I print a tattoo flash sheet to A4 or US Letter size?
Select your paper format in the settings card before opening print preview. When you click print, match your printer paper size to the format chosen in the tool, and uncheck headers and footers for a clean border.

### Can I mark flash designs as claimed after a client books them?
You can update availability directly in the designs table by clicking the claim button on that row. A claimed badge appears on the design in your printed sheet so clients know it is taken. If an appointment cancels, click the make available button to reopen the piece.

### Where are my uploaded flash photos and drawings stored?
All photos and artwork scans remain inside local storage in your web browser. Images are resized, compressed, and stripped of camera metadata on an off-screen canvas before saving. No files are uploaded to Poli International or sent across the internet.

### How do I make a focal flash design span two columns wide?
Check the centerpiece box in the design form before adding or updating the piece. In a two-column or three-column grid, that card expands across two cells to highlight larger artwork. You can use the drag-to-arrange view to position other flash pieces around it.

### Can I use different currencies for guest spots or travel dates?
You can select a different currency in the settings dropdown whenever you work in another country. The symbol updates across all price labels, deposit tags, and totals without altering the numbers you entered. This makes it simple to prepare flash sheets for international conventions.

### What is the difference between the flash sheet and the counter price list?
The flash sheet is an illustrated visual grid designed for client viewing binders and studio walls. The counter price list is a compact reference table designed for reception staff to check prices, deposits, and estimated times quickly. You can toggle between both layouts in the print preview window.

## Limits

The Tattoo Flash Sheet Builder cannot evaluate technical difficulty, placement complexity, or tattooing time. The artist must examine artwork, placement area, and client skin to decide appropriate sitting times and deposits.

The tool cannot enforce refund terms, cancellation policies, or client age requirements. Studio owners and tattooists set booking policies, verify legal age of consent, and follow local regulations.
