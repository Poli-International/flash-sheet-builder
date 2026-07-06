# Tattoo Flash Sheet Builder - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Schemas](#data-schemas)
3. [Calculation / Logic Algorithms](#calculation--logic-algorithms)
4. [API Reference](#api-reference)
5. [Integration Guide](#integration-guide)
6. [Customization](#customization)
7. [Performance](#performance)
8. [Browser Compatibility](#browser-compatibility)
9. [Security](#security)
10. [Version History](#version-history)
11. [Support and Contact](#support-and-contact)

## Architecture Overview

### Technology Stack

- **HTML5** with semantic elements and ARIA attributes
- **CSS3** with custom properties for theming
- **Vanilla JavaScript (ES6+)** with no external dependencies
- **LocalStorage API** for data persistence
- **CSS `@media print`** for print layout

### File Structure

```
flash-sheet-builder/
├── index.html          # Main application markup
├── css/
│   └── style.css       # Styling and print styles
└── js/
    └── app.js          # Application logic and event handlers
```

### Component Breakdown

The application consists of four main sections:

1. **Artist Info Panel** - Collects artist/studio name, contact information, and sheet date
2. **Add Flash Design Form** - Input fields for design name, style, size, price, and notes
3. **Design List Table** - Displays all added designs with sold/delete actions and summary statistics
4. **Print Modal** - Renders a print-friendly preview of the flash sheet

### Logic Breakdown

- **Data Layer**: `load()` and `save()` functions manage LocalStorage operations
- **Render Layer**: `render()` function updates the DOM based on current data state
- **Event Layer**: Event listeners handle user interactions (add, toggle sold, delete, print, export, clear)
- **Print Layer**: Generates a styled preview and triggers browser print dialog

## Data Schemas

### Flash Design Object

Each flash design stored in LocalStorage follows this schema:

```javascript
{
  name: "Serpent Rose",        // string - Design name (required)
  style: "Traditional",        // string - Selected from dropdown options
  size: "Medium (5–10 cm)",    // string - Selected from size options
  price: "80",                 // string - Numeric value from input
  notes: "Colour / B&G",       // string - Free text notes
  sold: false                  // boolean - Toggle sold status
}
```

### LocalStorage Key

- **Key**: `poli-flash-builder`
- **Value**: JSON array of flash design objects
- **Default**: Empty array `[]`

### Dropdown Options

**Style Options:**
- Traditional, Neo-Traditional, Blackwork, Fine Line, Geometric, Watercolour, Realism, Japanese, Tribal, Script / Lettering, Minimalist, Other

**Size Options:**
- Micro (under 3 cm), Small (3–5 cm), Medium (5–10 cm), Large (10–20 cm), XL (20 cm+)

## Calculation / Logic Algorithms

### `load()` Function

```
Purpose: Retrieve flash designs from LocalStorage
Steps:
1. Call localStorage.getItem('poli-flash-builder')
2. Parse JSON string to array
3. If null or invalid, return empty array []
4. Return parsed array
```

### `save(data)` Function

```
Purpose: Persist flash designs to LocalStorage
Parameters: data (array of design objects)
Steps:
1. Convert array to JSON string
2. Call localStorage.setItem('poli-flash-builder', jsonString)
```

### `render()` Function

```
Purpose: Update UI to reflect current data state
Steps:
1. Load designs array via load()
2. Update piece count badge with array length
3. If array is empty:
   - Hide list section
   - Show empty state message
4. If array has items:
   - Hide empty state
   - Show list section
   - Calculate statistics:
     a. Filter available designs (sold === false)
     b. Filter sold designs (sold === true)
     c. Sum prices of available designs
   - Update summary strip with: total count, available count, sold count, available value
   - Generate table rows with:
     - Row number (index + 1)
     - Escaped design properties
     - Sold/Available status badge
     - Sold toggle button and delete button
5. Attach event delegation for sold/delete buttons
```

### `fmtPrice(price)` Function

```
Purpose: Format price with currency symbol
Parameters: price (string or number)
Steps:
1. Parse price as float
2. Format to 2 decimal places
3. Prepend '£' symbol
4. Return formatted string (e.g., "£80.00")
```

### `escHtml(string)` Function

```
Purpose: Prevent XSS by escaping HTML special characters
Parameters: string (any value)
Steps:
1. Convert to string
2. Replace & with &amp;
3. Replace < with &lt;
4. Replace > with &gt;
5. Replace " with &quot;
6. Return escaped string
```

### Summary Calculations

```
Total Designs: pieces.length
Available Designs: pieces.filter(p => !p.sold).length
Sold Designs: pieces.filter(p => p.sold).length
Available Value: sum of parseFloat(p.price) for all available designs
```

## API Reference

### Public Functions

#### `load()`
- **Returns**: Array of flash design objects
- **Description**: Retrieves and parses data from LocalStorage

#### `save(data)`
- **Parameters**: `data` (array of design objects)
- **Returns**: void
- **Description**: Serializes and stores data to LocalStorage

#### `render()`
- **Parameters**: none
- **Returns**: void
- **Description**: Rebuilds the entire UI from current data state

#### `escHtml(s)`
- **Parameters**: `s` (any value)
- **Returns**: string
- **Description**: Escapes HTML special characters for safe rendering

#### `fmtPrice(p)`
- **Parameters**: `p` (string or number)
- **Returns**: string
- **Description**: Formats price with GBP currency symbol

### Event Handlers

#### `addBtn.addEventListener('click', ...)`
- **Trigger**: Click "Add Design" button
- **Behavior**: Validates design name, creates new design object, saves to LocalStorage, clears form fields, calls render()

#### `designsBody.addEventListener('click', ...)`
- **Trigger**: Click on sold toggle or delete button in table
- **Behavior**: 
  - Sold button: Toggles `sold` property, saves, re-renders
  - Delete button: Confirms deletion, removes design from array, saves, re-renders

#### `printBtn.addEventListener('click', ...)`
- **Trigger**: Click "Preview & Print" button
- **Behavior**: Generates print preview HTML with artist info and all designs, displays modal

#### `doPrintBtn.addEventListener('click', ...)`
- **Trigger**: Click "Print" button in modal
- **Behavior**: Calls `window.print()` to trigger browser print dialog

#### `exportBtn.addEventListener('click', ...)`
- **Trigger**: Click "Export CSV" button
- **Behavior**: Generates CSV string with headers, creates download link, triggers file download as `flash-sheet.csv`

#### `clearBtn.addEventListener('click', ...)`
- **Trigger**: Click "Clear All" button
- **Behavior**: Confirms action, removes LocalStorage key, calls render()

## Integration Guide

### Standalone Embedding

The tool is a dependency-free static HTML/CSS/JS application. To embed it:

**Option 1: Direct Link**
```
https://poliinternational.com/tools/flash-sheet-builder/
```

**Option 2: Iframe Embedding**
```html
<iframe 
  src="https://poliinternational.com/tools/flash-sheet-builder/" 
  width="100%" 
  height="800" 
  frameborder="0"
  title="Tattoo Flash Sheet Builder">
</iframe>
```

The tool supports iframe communication for theme synchronization. It listens for `message` events with `{ type: 'poli-theme', light: true/false }` to switch between light and dark themes.

### Data Persistence

All data is stored in the browser's LocalStorage under the key `poli-flash-builder`. Data persists across sessions but is specific to the browser and device. No server-side storage is used.

### Export Formats

- **CSV Export**: Generates a comma-separated values file with columns: Number, Name, Style, Size, Price, Status, Notes
- **Print Output**: Browser-native print dialog with a styled flash sheet preview

## Customization

### Styling

The tool uses CSS custom properties for theming. To customize:

1. Override CSS variables in the `:root` selector
2. Modify the `style.css` file for layout changes
3. Use `@media print` styles for print output customization

### Data Defaults

- Sheet date defaults to current date via `new Date().toISOString().slice(0, 10)`
- Price input uses `step="5"` for 5-unit increments
- All dropdown options are defined in the HTML markup

## Performance

- **Zero external dependencies**: No frameworks, libraries, or CDN resources
- **Minimal DOM operations**: Single `render()` function updates the entire UI
- **Efficient event delegation**: Single click handler on table body for all row actions
- **LocalStorage operations**: Synchronous but negligible for small datasets (typical flash sheets contain 10-50 designs)
- **No network requests**: Fully client-side, no API calls or resource loading

## Browser Compatibility

The tool uses standard web APIs supported in all modern browsers:

- **LocalStorage API**: Supported in IE8+, all modern browsers
- **ES6 Features**: Arrow functions, template literals, `let/const`, `Array.filter/map/reduce`
- **CSS Custom Properties**: Supported in all modern browsers (IE11 partial support)
- **Print API**: `window.print()` supported in all browsers

**Minimum browser versions:**
- Chrome 49+
- Firefox 45+
- Safari 10+
- Edge 14+
- Opera 36+

## Security

### XSS Prevention

All user input is sanitized before rendering using the `escHtml()` function:

```javascript
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

This function escapes HTML special characters in:
- Design names
- Style selections
- Size selections
- Notes fields
- Artist/studio name
- Contact information

### CSV Injection Prevention

The CSV export wraps all values in double quotes and escapes existing double quotes:

```javascript
.map(v => `"${String(v || '').replace(/"/g, '""')}"`)
```

### Data Isolation

- All data is stored in browser LocalStorage only
- No data is transmitted to any server
- No cookies are used
- No tracking or analytics scripts are included

### Input Validation

- Design name is required (shows alert if empty)
- Price input accepts only numeric values with `min="0"` and `step="5"`
- Delete operations require user confirmation via `confirm()` dialogs
- Clear all operation requires user confirmation

## Version History

### Version 1.0.0 (Current)

- Initial release of Tattoo Flash Sheet Builder
- Features: Add/remove designs, toggle sold status, print preview, CSV export
- LocalStorage-based data persistence
- Responsive design with dark/light theme support
- No external dependencies

## Support and Contact

For technical support, feature requests, or bug reports:

- **Email**: support@poliinternational.com
- **Website**: https://poliinternational.com
- **Tool URL**: https://poliinternational.com/tools/flash-sheet-builder/
