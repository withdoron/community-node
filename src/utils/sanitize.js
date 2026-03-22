import DOMPurify from 'dompurify';

// Strip all HTML tags — plain text only
export const sanitizeText = (input) => {
  if (!input || typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

// Allow basic formatting (bold, italic, links) — for rich text fields if needed
export const sanitizeRichText = (input) => {
  if (!input || typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};
