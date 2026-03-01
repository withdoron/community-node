/**
 * SELCO Credit Union PDF statement parser.
 * Parses text extracted by pdf.js — which produces ONE continuous string with no newlines.
 *
 * Transaction pattern in the blob:
 *   MM/DD   [-]amount   balance [description until next transaction]
 *
 * Key: transactions use plain numbers (no $ sign). Starting/Ending Balance use $XX.XX.
 */

function extractStatementMonth(text) {
  const months = [
    [/(?:January|Jan)\s+(\d{4})/i, '01'],
    [/(?:February|Feb)\s+(\d{4})/i, '02'],
    [/(?:March|Mar)\s+(\d{4})/i, '03'],
    [/(?:April|Apr)\s+(\d{4})/i, '04'],
    [/(?:May)\s+(\d{4})/i, '05'],
    [/(?:June|Jun)\s+(\d{4})/i, '06'],
    [/(?:July|Jul)\s+(\d{4})/i, '07'],
    [/(?:August|Aug)\s+(\d{4})/i, '08'],
    [/(?:September|Sep)\s+(\d{4})/i, '09'],
    [/(?:October|Oct)\s+(\d{4})/i, '10'],
    [/(?:November|Nov)\s+(\d{4})/i, '11'],
    [/(?:December|Dec)\s+(\d{4})/i, '12'],
  ];
  for (const [regex, mm] of months) {
    const match = text.match(regex);
    if (match) return `${match[1]}-${mm}`;
  }
  const period = text.match(/(\d{1,2})\/\d{1,2}\/(\d{4})\s+through/i);
  if (period) return `${period[2]}-${period[1].padStart(2, '0')}`;
  const fallback = new Date();
  return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Extract the transaction type prefix from a raw SELCO description.
 * Returns: "recurring" | "debit" | "transfer_in" | "check_deposit" | "cash_withdrawal" | "bill_pay" | "refund" | "other"
 */
export function extractTransactionType(rawDescription) {
  if (!rawDescription || typeof rawDescription !== 'string') return 'other';
  const s = rawDescription.trim();
  if (/^Recurring Withdrawal Debit Card\b/i.test(s)) return 'recurring';
  if (/^Withdrawal Debit Card\b/i.test(s)) return 'debit';
  if (/^Deposit Transfer\b/i.test(s)) return 'transfer_in';
  if (/^Deposit by Check\b/i.test(s)) return 'check_deposit';
  if (/^Withdrawal by Cash\b/i.test(s)) return 'cash_withdrawal';
  if (/^Recurring Withdrawal Bill Payment\b/i.test(s)) return 'bill_pay';
  if (/^Withdrawal Adjustment Debit Card Credit Voucher\b/i.test(s)) return 'refund';
  if (/^Withdrawal Adjustment\b/i.test(s)) return 'refund';
  return 'other';
}

const TXN_TYPE_PREFIXES = [
  'Recurring Withdrawal Debit Card',
  'Withdrawal Debit Card',
  'Deposit Transfer',
  'Deposit by Check',
  'Withdrawal by Cash',
  'Recurring Withdrawal Bill Payment',
  'Withdrawal Adjustment Debit Card Credit Voucher',
  'Withdrawal Adjustment',
];

/**
 * Clean raw SELCO description to extract the readable vendor name.
 * Strips transaction type prefixes, reference codes, phone numbers, addresses, etc.
 */
export function cleanVendorName(rawDescription) {
  if (!rawDescription || typeof rawDescription !== 'string') return '';
  let s = rawDescription.trim();
  if (!s) return '';

  // 1. Strip transaction type prefix
  for (const prefix of TXN_TYPE_PREFIXES) {
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    s = s.replace(re, '');
  }

  // 2. Strip "From " at start (for transfers)
  s = s.replace(/^From\s+/i, '');

  // 3. Strip long numeric reference codes (15+ digits) and surrounding " - "
  s = s.replace(/\s*-\s*\d{15,}\s*(-\s*)?/g, ' ');
  s = s.replace(/\s*-\s*\d{15,}/g, '');

  // 4. Strip "POS #XXXXXXXXX" (6+ digit ref)
  s = s.replace(/POS\s*#\d{6,}\s*/gi, '');

  // 5. Strip "Bill Payment #XXXXXXXXX"
  s = s.replace(/Bill\s*Payment\s*#\d{6,}\s*/gi, '');

  // 6. Strip standalone "#XXXXXXXXX" (6+ digits)
  s = s.replace(/#\d{6,}\b/g, '');

  // 7. Strip phone numbers (xxx-xxx-xxxx, xxx-xxxxxxx, etc.)
  s = s.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '');
  s = s.replace(/\b\d{3}[-.]?\d{4,7}\b/g, '');

  // 8. Strip MM/DD date patterns
  s = s.replace(/\b\d{1,2}\/\d{1,2}\b/g, '');

  // 9. Strip "NST " prefix
  s = s.replace(/^NST\s+/i, '');

  // 10. Strip trailing state abbreviations
  s = s.replace(/\s+(CA|OR|NY|PA|FL|WA|TX|CO|AZ|NV)\s*$/i, '');

  // 11. Strip trailing address fragments (e.g. "3300 GATEWAY ST", "SPRINGFIELD OR")
  s = s.replace(/\s+\d+\s+[A-Z0-9\s]+(?:ST|AVE|RD|BLVD|DR|LN|WAY)\s*$/i, '');
  s = s.replace(/\s+[A-Z][A-Za-z]+\s+(CA|OR|NY|PA|FL|WA|TX)\s*$/i, '');

  // 12. Strip trailing numeric refs like "0000119"
  s = s.replace(/\s+\d{6,}\s*$/g, '');

  // Collapse multiple spaces, trim
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}

/**
 * Clean up a raw description string extracted between two transaction matches.
 * Removes trailing/leading junk, page footers, and header repeats.
 */
function cleanDescription(raw) {
  if (!raw) return '';
  let desc = raw.trim();

  // Remove page break artifacts (Member Number, Statement Date, Page, selco.org, PO Box, etc.)
  desc = desc.replace(/Member Number:\s*\d+/gi, '');
  desc = desc.replace(/Statement Date:\s*[^\s]+\s+through\s+[^\s]+/gi, '');
  desc = desc.replace(/Page:\s*\d+\s*of\s*\d+/gi, '');
  desc = desc.replace(/Member Since:\s*\d+/gi, '');
  desc = desc.replace(/PO Box \d+\s+\w+,\s*\w+\s+\d+/gi, '');
  desc = desc.replace(/selco\.org\s*\/?\s*[\d-]*/gi, '');
  desc = desc.replace(/Trans\s+Eff\.\s*Date\s+Date\s+Transaction Description\s+Amount\s+Balance/gi, '');

  // Collapse multiple spaces
  desc = desc.replace(/\s{2,}/g, ' ').trim();

  return desc;
}

const CHECKING_MARKER = 'ID : 10 LINK DIGITAL CHECKING';

/**
 * Main regex: find MM/DD followed by whitespace, a signed number (no $), whitespace, another number (no $).
 *
 * This matches transaction lines like:
 *   01/01   -10.99   50.51
 *   01/05   700.00   750.51
 *   01/26   2,100.00   2,133.27
 *
 * It does NOT match:
 *   01/01   Starting Balance   $61.50   (has $ sign and text before amount)
 *   01/31   Ending Balance...   $912.76  (has $ sign)
 *
 * Capture groups: (month)(day) (amount) (balance)
 */
const TXN_PATTERN = /(\d{1,2})\/(\d{1,2})\s{2,}(-?[\d,]+\.\d{2})\s{2,}([\d,]+\.\d{2})/g;

export const parseSelcoStatement = (text) => {
  if (!text || typeof text !== 'string') {
    return { month: extractStatementMonth(''), transactions: [] };
  }

  const month = extractStatementMonth(text);
  const year = month.slice(0, 4);

  // Narrow to checking section
  const checkStart = text.indexOf(CHECKING_MARKER);
  // Find end of checking section
  const endMarker = text.indexOf('Ending Balance for LINK DIGITAL CHECKING');
  const sectionEndMarker = text.indexOf('Total Deposits:');
  const endIdx = endMarker >= 0 ? endMarker : (sectionEndMarker >= 0 ? sectionEndMarker : text.length);
  const section = checkStart >= 0 ? text.slice(checkStart, endIdx) : text.slice(0, endIdx);

  // Find all transaction matches with their positions
  const matches = [];
  let m;
  TXN_PATTERN.lastIndex = 0;
  while ((m = TXN_PATTERN.exec(section)) !== null) {
    matches.push({
      index: m.index,
      endIndex: m.index + m[0].length,
      month: m[1].padStart(2, '0'),
      day: m[2].padStart(2, '0'),
      amount: parseFloat(m[3].replace(/,/g, '')),
      balance: parseFloat(m[4].replace(/,/g, '')),
    });
  }

  // Now extract descriptions: the text between one match's end and the next match's start
  const transactions = [];
  for (let i = 0; i < matches.length; i++) {
    const txn = matches[i];
    const date = `${year}-${txn.month}-${txn.day}`;

    // Description is the text from after this match to the start of the next match
    const descStart = txn.endIndex;
    const descEnd = i + 1 < matches.length ? matches[i + 1].index : section.length;
    const rawDesc = section.slice(descStart, descEnd);
    const description = cleanDescription(rawDesc);

    // Skip if this looks like a "Starting Balance" or "Ending Balance" match
    // (These won't match because they use $ signs, but just in case)
    if (/Starting Balance|Ending Balance/i.test(description) && transactions.length === 0) {
      continue;
    }

    const rawDescTrimmed = rawDesc.trim();
    const cleanedDescription = cleanVendorName(rawDescTrimmed);
    const transactionType = extractTransactionType(rawDescTrimmed);

    transactions.push({
      date,
      description,
      amount: txn.amount,
      balance: txn.balance,
      raw_description: rawDescTrimmed,
      cleaned_description: cleanedDescription,
      transaction_type: transactionType,
    });
  }

  return { month, transactions };
};
