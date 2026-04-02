import sanitizeHtml from 'sanitize-html';

const STRIP_ALL_HTML_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
};

function normalizeText(input) {
  const asString = String(input ?? '');
  // Remove non-printable control chars except common whitespace.
  return asString.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function sanitizePlainText(input) {
  return sanitizeHtml(normalizeText(input), STRIP_ALL_HTML_OPTIONS).trim();
}

export function sanitizeMarkdownText(input) {
  // Keep markdown syntax but strip embedded raw HTML/script payloads.
  return sanitizeHtml(normalizeText(input), STRIP_ALL_HTML_OPTIONS);
}
