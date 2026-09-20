import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Tattoo Flash Sheet Builder' });
});

// Poli website tool path aliases
app.use('/tools/flash-sheet-builder/css', express.static(path.join(__dirname, 'css')));
app.use('/tools/flash-sheet-builder/js', express.static(path.join(__dirname, 'js')));
app.use('/tools/flash-sheet-builder', express.static(__dirname));

// Shared styles and validation scripts
app.use('/tools/shared', express.static(path.join(__dirname, 'tools/shared')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve root static assets
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
