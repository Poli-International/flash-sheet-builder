/**
 * Poli International - Shared Input Validation Guards
 *
 * Cross-tool validation utilities for all calculator UIs.
 * Drop-in: no dependencies, no globals polluting (all namespaced).
 *
 * Usage:
 *   <script src="/js/input-guards.js"></script>
 *   const v = InputGuards.safeFloat(el, 0);
 *   if (!InputGuards.isValid(v)) { ... }
 *
 * @overview Centralises NaN guarding, range checks, cross-field warnings,
 *           safe division, and inline error/warning rendering.
 * @since   2026-06-23  Hermes T12: 68-input-validation-spec
 */

'use strict';

var InputGuards = (function () {
  'use strict';

  /* ── HTML escaping (XSS protection) ── */
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Number parsing ───────────────────────────────────────── */
  /**
   * Parse a numeric value safely. Handles European decimal comma,
   * whitespace, and currency symbols.
   *
   * @param {string|number} raw   value from input.value
   * @param {number}         fallback returned if NaN (default NaN)
   * @returns {number}
   */
  function safeFloat(raw, fallback) {
    if (raw === null || raw === undefined || raw === '') return arguments.length > 1 ? fallback : NaN;
    var s = String(raw).trim();
    // Strip common currency/unit suffixes
    s = s.replace(/[£€$%\s]|mm$|cm$|in$|ml$|oz$|years?$/gi, '');
    // European decimal comma
    s = s.replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? (arguments.length > 1 ? fallback : NaN) : n;
  }

  /**
   * True when value is a finite number (not NaN, not Infinity).
   * @param {*} v
   * @returns {boolean}
   */
  function isValid(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /* ── Range guards ─────────────────────────────────────────── */
  /**
   * Check whether value is inside [min, max] (inclusive).
   * Returns { ok: boolean, message: string|null }
   */
  function inRange(value, min, max, label) {
    var defLabel = window.i18n ? window.i18n.t('guards.defaultValue') : 'Value';
    var lbl = label || defLabel;
    if (!isValid(value)) {
      var msg = window.i18n
        ? window.i18n.t('guards.validNumber', { label: lbl })
        : (lbl + ' must be a valid number.');
      return { ok: false, message: msg };
    }
    if (value < min) {
      var msgMin = window.i18n
        ? window.i18n.t('guards.min', { label: lbl, min: min })
        : (lbl + ' must be at least ' + min + '.');
      return { ok: false, message: msgMin };
    }
    if (value > max) {
      var msgMax = window.i18n
        ? window.i18n.t('guards.max', { label: lbl, max: max })
        : (lbl + ' must not exceed ' + max + '.');
      return { ok: false, message: msgMax };
    }
    return { ok: true, message: null };
  }

  /**
   * Check that value is strictly positive (> 0).
   */
  function positive(value, label) {
    var defLabel = window.i18n ? window.i18n.t('guards.defaultValue') : 'value';
    var lbl = label || defLabel;
    if (!isValid(value) || value <= 0) {
      var msg = window.i18n
        ? window.i18n.t('guards.positive', { label: lbl })
        : ('Enter a ' + lbl + ' greater than zero.');
      return { ok: false, message: msg };
    }
    return { ok: true, message: null };
  }

  /**
   * Soft warning: value outside expected typical range,
   * but not blocked.
   */
  function unusualRange(value, typicalMin, typicalMax, label) {
    if (!isValid(value)) return null;
    var defLabel = window.i18n ? window.i18n.t('guards.defaultMeasurement') : 'measurement';
    var lbl = label || defLabel;
    if (value < typicalMin || value > typicalMax) {
      return window.i18n
        ? window.i18n.t('guards.unusualRange', { label: lbl, min: typicalMin, max: typicalMax })
        : ('Unusual ' + lbl + ': typical range is ' + typicalMin + '–' + typicalMax + '. Verify before proceeding.');
    }
    return null;
  }

  /* ── Safe arithmetic ──────────────────────────────────────── */
  /**
   * Divide, returning fallback when denominator is 0.
   */
  function safeDiv(numerator, denominator, fallback) {
    var fb = arguments.length > 2 ? fallback : NaN;
    if (!isValid(numerator) || !isValid(denominator) || denominator === 0) return fb;
    return numerator / denominator;
  }

  /* ── Error/warning rendering ──────────────────────────────── */
  /**
   * Blocking error (red). Prevents calculation.
   * @param {string} message
   * @returns {string} HTML
   */
  function formatError(message) {
    return '<div class="poli-err-card" role="alert">' + esc(message) + '</div>';
  }

  /**
   * Warning (amber). Allows but flags.
   * @param {string} message
   * @returns {string} HTML
   */
  function formatWarning(message) {
    return '<div class="poli-warn-card" role="alert">' + esc(message) + '</div>';
  }

  /* ── Default CSS injection ────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('poli-input-guards-css')) return;
    var style = document.createElement('style');
    style.id = 'poli-input-guards-css';
    style.textContent =
      '.poli-err-card{background:#451a1a;border-left:4px solid #ef4444;color:#fca5a5;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.95rem;}' +
      '.poli-warn-card{background:#453a1a;border-left:4px solid #f59e0b;color:#fcd34d;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.95rem;}';
    document.head.appendChild(style);
  }

  /* Auto-inject on load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    esc: esc,
    safeFloat: safeFloat,
    isValid: isValid,
    inRange: inRange,
    positive: positive,
    unusualRange: unusualRange,
    safeDiv: safeDiv,
    formatError: formatError,
    formatWarning: formatWarning,
  };
})();
