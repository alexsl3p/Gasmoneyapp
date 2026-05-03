import { FuelType, ParsedReceipt } from './types';

const ESTONIAN_MONTHS: Record<string, string> = {
  jaanuar: '01', veebruar: '02', 'märts': '03', aprill: '04',
  mai: '05', juuni: '06', juuli: '07', august: '08',
  september: '09', oktoober: '10', november: '11', detsember: '12',
};

export function parseReceiptText(text: string): ParsedReceipt {
  const result: ParsedReceipt = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- Fuel type (check early, broad patterns) ---
  if (/bensiin\s*98|98\s*(?: oktaan|oktan)?/i.test(text)) {
    result.fuelType = '98';
  } else if (/bensiin\s*95|95\s*(?: oktaan|oktan)?/i.test(text)) {
    result.fuelType = '95';
  }

  // --- Liters ---
  // Handle "LIITRID\n40.67" (value on next line) and "LIITRID  40.67" (same line)
  const litersLineIdx = lines.findIndex(l => /^liitrid$/i.test(l));
  if (litersLineIdx !== -1) {
    // Value may be on same line or next line, possibly alongside TASUTUD value
    const nextLine = lines[litersLineIdx + 1] ?? '';
    const nums = nextLine.match(/(\d{1,3}[.,]\d{2,3})/g);
    if (nums && nums.length >= 1) {
      result.liters = parseFloat(nums[0].replace(',', '.'));
    }
  } else {
    // Inline: "LIITRID   40.67" or "LIITRID: 40.67"
    const m = text.match(/LIITRID[:\s]+(\d{1,3}[.,]\d{2,3})/i);
    if (m) result.liters = parseFloat(m[1].replace(',', '.'));
  }
  // Fallback number pattern for liters if still not found
  if (!result.liters) {
    const m = text.match(/(\d{2,3}[.,]\d{3})\s*(?:L|l|liitrit)/);
    if (m) result.liters = parseFloat(m[1].replace(',', '.'));
  }

  // --- Amount paid ---
  // Handle "TASUTUD\n40.67   69.10€" (value on next line, amount is LAST number)
  // or "TASUTUD   69.10€"
  const tasutudLineIdx = lines.findIndex(l => /^tasutud$/i.test(l));
  if (tasutudLineIdx !== -1) {
    const nextLine = lines[tasutudLineIdx + 1] ?? '';
    const nums = nextLine.match(/(\d{1,4}[.,]\d{2})/g);
    if (nums && nums.length >= 1) {
      // Last number on the line is the total amount
      result.grossAmount = parseFloat(nums[nums.length - 1].replace(',', '.'));
    }
  } else {
    // When LIITRID and TASUTUD are on the SAME line, values are on next line
    const sameLineIdx = lines.findIndex(l => /liitrid.*tasutud/i.test(l));
    if (sameLineIdx !== -1) {
      const nextLine = lines[sameLineIdx + 1] ?? '';
      const nums = nextLine.match(/(\d{1,4}[.,]\d{2,3})/g);
      if (nums && nums.length >= 2) {
        result.liters = parseFloat(nums[0].replace(',', '.'));
        result.grossAmount = parseFloat(nums[nums.length - 1].replace(',', '.'));
      } else if (nums && nums.length === 1) {
        result.grossAmount = parseFloat(nums[0].replace(',', '.'));
      }
    } else {
      // Inline TASUTUD
      const m = text.match(/TASUTUD[:\s]+(\d{1,4}[.,]\d{2})\s*€?/i);
      if (m) result.grossAmount = parseFloat(m[1].replace(',', '.'));
    }
  }
  // Fallback: find €-suffixed number
  if (!result.grossAmount) {
    const m = text.match(/(\d{1,4}[.,]\d{2})\s*€/);
    if (m) result.grossAmount = parseFloat(m[1].replace(',', '.'));
  }

  // --- Date ---
  const estDateMatch = text.match(
    /(\d{1,2})\.\s*(jaanuar|veebruar|märts|aprill|mai|juuni|juuli|august|september|oktoober|november|detsember)\s+(\d{4})/i,
  );
  if (estDateMatch) {
    const day = estDateMatch[1].padStart(2, '0');
    const month = ESTONIAN_MONTHS[estDateMatch[2].toLowerCase()] ?? '01';
    result.date = `${estDateMatch[3]}-${month}-${day}`;
  } else {
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    const dmyMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (isoMatch) result.date = isoMatch[0];
    else if (dmyMatch) result.date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  // --- Time ---
  // Exclude year-like patterns (17:11 is fine, but avoid matching version numbers etc)
  const timeMatch = text.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) result.time = `${timeMatch[1]}:${timeMatch[2]}`;

  // --- Station ---
  // Line after TŠEKK/TSEKK/receipt header
  const tsekkIdx = lines.findIndex(l => /^tšekk$|^tsekk$|^receipt$/i.test(l));
  if (tsekkIdx !== -1 && tsekkIdx + 1 < lines.length) {
    const candidate = lines[tsekkIdx + 1];
    if (candidate.length >= 3 && candidate.length < 60 && !/^\d/.test(candidate)) {
      result.station = candidate;
    }
  }
  if (!result.station) {
    const m = text.match(/([A-ZÄÖÜÕ][a-zA-ZäöüõÄÖÜÕ\s]{2,30}(?:ATM|Tankla|jaam))/);
    if (m) result.station = m[1].trim();
  }

  return result;
}
