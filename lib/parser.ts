import { FuelType, ParsedReceipt } from './types';

const ESTONIAN_MONTHS: Record<string, string> = {
  jaanuar: '01', veebruar: '02', 'märts': '03', aprill: '04',
  mai: '05', juuni: '06', juuli: '07', august: '08',
  september: '09', oktoober: '10', november: '11', detsember: '12',
};

export function parseReceiptText(text: string): ParsedReceipt {
  const result: ParsedReceipt = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full = text.toLowerCase();

  // --- Liters ---
  const litersMatch =
    text.match(/LIITRID[\s\S]{0,20}?(\d{1,3}[.,]\d{1,3})/i) ||
    text.match(/LITERS[\s\S]{0,20}?(\d{1,3}[.,]\d{1,3})/i) ||
    text.match(/(\d{2,3}[.,]\d{2,3})\s*(L|l|liitrit)/);
  if (litersMatch) {
    result.liters = parseFloat(litersMatch[1].replace(',', '.'));
  }

  // --- Amount ---
  const amountMatch =
    text.match(/TASUTUD[\s\S]{0,30}?(\d{1,4}[.,]\d{2})\s*€?/i) ||
    text.match(/PAID[\s\S]{0,30}?(\d{1,4}[.,]\d{2})\s*€?/i) ||
    text.match(/(\d{1,4}[.,]\d{2})\s*€/);
  if (amountMatch) {
    result.grossAmount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  // --- Fuel type ---
  if (/bensiin\s*98|95\s*\+?\s*\(?premium\)?|98\b/i.test(text)) {
    result.fuelType = '98';
  } else if (/bensiin\s*95|95\b/i.test(text)) {
    result.fuelType = '95';
  }

  // --- Date: Estonian format "28. aprill 2026" ---
  const estDateMatch = text.match(
    /(\d{1,2})\.\s*(jaanuar|veebruar|märts|aprill|mai|juuni|juuli|august|september|oktoober|november|detsember)\s+(\d{4})/i,
  );
  if (estDateMatch) {
    const day = estDateMatch[1].padStart(2, '0');
    const month = ESTONIAN_MONTHS[estDateMatch[2].toLowerCase()] ?? '01';
    const year = estDateMatch[3];
    result.date = `${year}-${month}-${day}`;
  } else {
    // ISO / DD.MM.YYYY fallback
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    const dmyMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (isoMatch) {
      result.date = isoMatch[0];
    } else if (dmyMatch) {
      result.date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }
  }

  // --- Time: HH:mm ---
  const timeMatch = text.match(/\b(\d{2}):(\d{2})\b/);
  if (timeMatch) {
    result.time = `${timeMatch[1]}:${timeMatch[2]}`;
  }

  // --- Station: line before or after TŠEKK / receipt header ---
  const tsekkIdx = lines.findIndex(l => /tšekk|tsekk|receipt/i.test(l));
  if (tsekkIdx !== -1 && tsekkIdx + 1 < lines.length) {
    const candidate = lines[tsekkIdx + 1];
    if (candidate.length > 2 && candidate.length < 60 && !/^\d/.test(candidate)) {
      result.station = candidate;
    }
  }
  // Fallback: look for "ATM" station name patterns
  if (!result.station) {
    const stationMatch = text.match(/([A-ZÄÖÜÕ][a-zA-ZäöüõÄÖÜÕ\s]+\s+ATM)/);
    if (stationMatch) result.station = stationMatch[1].trim();
  }

  return result;
}
