// Client-side validation only. MIME type is browser-reported and spoofable.
// Base44 storage has its own server-side validation. Future hardening: magic byte checks.
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_RECEIPT_TYPES = [...ACCEPTED_IMAGE_TYPES, 'application/pdf'];

export const validateFile = (file, options = {}) => {
  const maxSize = options.maxSize || MAX_PHOTO_SIZE;
  const acceptedTypes = options.acceptedTypes || ACCEPTED_IMAGE_TYPES;

  if (file.size > maxSize) {
    return { valid: false, error: `File must be under ${Math.round(maxSize / 1024 / 1024)}MB` };
  }
  if (!acceptedTypes.includes(file.type)) {
    return { valid: false, error: `Accepted formats: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}` };
  }
  return { valid: true };
};
