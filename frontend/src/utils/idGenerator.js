/**
 * Generate a short ID in format: PREFIX + 4 digits (e.g., INV9001, BKG7826)
 * This is a client-side version that generates IDs without checking uniqueness
 * The backend will handle uniqueness validation
 * @param {String} prefix - 3 letter prefix (e.g., 'INV', 'BKG', 'BLI')
 * @returns {String} Generated ID
 */
export function generateShortId(prefix) {
  // Generate random 4-digit number (1000-9999)
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${number}`;
}

/**
 * Generate a unique billing ID (BLI + 4 digits)
 */
export function generateBillingId() {
  return generateShortId('BLI');
}

/**
 * Generate a unique booking ID (BKG + 4 digits)
 */
export function generateBookingId() {
  return generateShortId('BKG');
}

