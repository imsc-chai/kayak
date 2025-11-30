const mongoose = require('mongoose');

/**
 * Get Billing model (lazy load to avoid circular dependency)
 */
function getBillingModel() {
  // Use mongoose.models to get already registered model (avoids circular dependency)
  if (mongoose.models.Billing) {
    return mongoose.models.Billing;
  }
  // If model not registered yet, this will be called after model is registered
  // Return null and let the caller handle it
  return null;
}

/**
 * Generate a short ID in format: PREFIX + 4 digits (e.g., INV9001, BKG7826)
 * @param {String} prefix - 3 letter prefix (e.g., 'INV', 'BKG', 'BLI')
 * @param {Function} checkExists - Function to check if ID already exists
 * @returns {Promise<String>} Generated ID
 */
async function generateShortId(prefix, checkExists) {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Generate random 4-digit number (1000-9999)
    const number = Math.floor(1000 + Math.random() * 9000);
    const id = `${prefix}${number}`;
    
    // Check if ID already exists
    const exists = await checkExists(id);
    if (!exists) {
      return id;
    }
    
    attempts++;
  }
  
  // Fallback: if we can't find a unique ID after max attempts, use timestamp
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Generate a unique invoice number (INV + 4 digits)
 */
async function generateInvoiceNumber() {
  return generateShortId('INV', async (id) => {
    const Billing = getBillingModel();
    if (!Billing) {
      // Model not registered yet, assume ID doesn't exist
      return false;
    }
    const exists = await Billing.findOne({ 'invoiceDetails.invoiceNumber': id });
    return !!exists;
  });
}

/**
 * Generate a unique billing ID (BLI + 4 digits)
 */
async function generateBillingId() {
  return generateShortId('BLI', async (id) => {
    const Billing = getBillingModel();
    if (!Billing) {
      // Model not registered yet, assume ID doesn't exist
      return false;
    }
    const exists = await Billing.findOne({ billingId: id });
    return !!exists;
  });
}

module.exports = {
  generateShortId,
  generateInvoiceNumber,
  generateBillingId
};

