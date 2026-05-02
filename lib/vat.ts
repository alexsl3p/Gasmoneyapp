const VAT_RATE = 0.24;

export function calculateVat(gross: number): { gross: number; net: number; vat: number } {
  const net = gross / (1 + VAT_RATE);
  const vat = gross - net;
  return {
    gross: round2(gross),
    net: round2(net),
    vat: round2(vat),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
