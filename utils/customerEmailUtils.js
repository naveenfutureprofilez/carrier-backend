/**
 * Customer Email Utility Functions
 * These functions provide a consistent interface for accessing customer emails
 * regardless of whether they use the old format or new dynamic emails array
 */

/**
 * Get all email addresses for a customer
 * @param {Object} customer - Customer object
 * @returns {Array} Array of email addresses
 */
function getAllCustomerEmails(customer) {
  if (!customer) return [];

  // If customer has the new emails array format, use it
  if (customer.emails && Array.isArray(customer.emails) && customer.emails.length > 0) {
    return customer.emails.map(emailObj => emailObj.email).filter(email => email && email.trim() !== '');
  }

  // Fallback to legacy format
  const emails = [];
  if (customer.email && customer.email.trim() !== '') {
    emails.push(customer.email.trim());
  }
  if (customer.secondary_email && 
      customer.secondary_email.trim() !== '' && 
      customer.secondary_email.trim() !== customer.email?.trim()) {
    emails.push(customer.secondary_email.trim());
  }

  return emails;
}

/**
 * Get the primary email address for a customer
 * @param {Object} customer - Customer object
 * @returns {String|null} Primary email address or null if not found
 */
function getPrimaryCustomerEmail(customer) {
  if (!customer) return null;

  // If customer has the new emails array format, find primary email
  if (customer.emails && Array.isArray(customer.emails) && customer.emails.length > 0) {
    const primaryEmail = customer.emails.find(emailObj => emailObj.is_primary);
    if (primaryEmail && primaryEmail.email) {
      return primaryEmail.email.trim();
    }
    // If no primary email is marked, return the first valid email
    const firstValidEmail = customer.emails.find(emailObj => emailObj.email && emailObj.email.trim() !== '');
    return firstValidEmail ? firstValidEmail.email.trim() : null;
  }

  // Fallback to legacy format - primary email is the main 'email' field
  return customer.email && customer.email.trim() !== '' ? customer.email.trim() : null;
}

/**
 * Get secondary email addresses for a customer (all except primary)
 * @param {Object} customer - Customer object
 * @returns {Array} Array of secondary email addresses
 */
function getSecondaryCustomerEmails(customer) {
  if (!customer) return [];

  // If customer has the new emails array format, get all non-primary emails
  if (customer.emails && Array.isArray(customer.emails) && customer.emails.length > 0) {
    return customer.emails
      .filter(emailObj => !emailObj.is_primary && emailObj.email && emailObj.email.trim() !== '')
      .map(emailObj => emailObj.email.trim());
  }

  // Fallback to legacy format
  const secondaryEmails = [];
  if (customer.secondary_email && 
      customer.secondary_email.trim() !== '' && 
      customer.secondary_email.trim() !== customer.email?.trim()) {
    secondaryEmails.push(customer.secondary_email.trim());
  }

  return secondaryEmails;
}

/**
 * Get customer emails formatted for sending (includes both primary and secondary)
 * This is the main function to use for invoice and rate confirmation emails
 * @param {Object} customer - Customer object
 * @returns {Array} Array of email addresses to send to
 */
function getCustomerEmailsForSending(customer) {
  return getAllCustomerEmails(customer);
}

/**
 * Get customer emails in a format suitable for email clients (comma-separated)
 * @param {Object} customer - Customer object
 * @returns {String} Comma-separated email addresses
 */
function getCustomerEmailsAsString(customer) {
  const emails = getAllCustomerEmails(customer);
  return emails.join(', ');
}

/**
 * Validate if customer has at least one valid email address
 * @param {Object} customer - Customer object
 * @returns {Boolean} True if customer has at least one valid email
 */
function hasValidEmail(customer) {
  const emails = getAllCustomerEmails(customer);
  return emails.length > 0;
}

/**
 * Get email addresses with metadata (for admin purposes)
 * @param {Object} customer - Customer object
 * @returns {Array} Array of email objects with metadata
 */
function getCustomerEmailsWithMetadata(customer) {
  if (!customer) return [];

  // If customer has the new emails array format, return it with metadata
  if (customer.emails && Array.isArray(customer.emails) && customer.emails.length > 0) {
    return customer.emails.filter(emailObj => emailObj.email && emailObj.email.trim() !== '');
  }

  // Convert legacy format to new format structure for consistency
  const emailsWithMetadata = [];
  if (customer.email && customer.email.trim() !== '') {
    emailsWithMetadata.push({
      email: customer.email.trim(),
      is_primary: true,
      created_at: customer.createdAt || new Date()
    });
  }
  if (customer.secondary_email && 
      customer.secondary_email.trim() !== '' && 
      customer.secondary_email.trim() !== customer.email?.trim()) {
    emailsWithMetadata.push({
      email: customer.secondary_email.trim(),
      is_primary: false,
      created_at: customer.createdAt || new Date()
    });
  }

  return emailsWithMetadata;
}

module.exports = {
  getAllCustomerEmails,
  getPrimaryCustomerEmail,
  getSecondaryCustomerEmails,
  getCustomerEmailsForSending,
  getCustomerEmailsAsString,
  hasValidEmail,
  getCustomerEmailsWithMetadata
};
