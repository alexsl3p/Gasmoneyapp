export type FuelType = '95' | '98';

export interface Receipt {
  id: string;
  date: string;
  time?: string;
  station?: string;
  fuelType: FuelType;
  liters: number;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  pricePerLiter: number;
  imageUri?: string;
  rawOcrText?: string;
  createdAt: string;
}

export interface MonthSummary {
  month: string; // "YYYY-MM"
  fuel95: FuelSummary;
  fuel98: FuelSummary;
  combined: FuelSummary;
}

export interface FuelSummary {
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  liters: number;
  avgPricePerLiter: number;
  count: number;
}

export interface ParsedReceipt {
  date?: string;
  time?: string;
  station?: string;
  fuelType?: FuelType;
  liters?: number;
  grossAmount?: number;
}
