import sanitizeHtml from 'sanitize-html';

export const sanitizeInput = (value: string): string =>
  sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
