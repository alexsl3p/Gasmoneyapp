import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt, FuelSummary, MonthSummary } from './types';
import { round2 } from './vat';

const KEY = 'receipts_v1';

async function loadAll(): Promise<Receipt[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Receipt[];
}

async function saveAll(receipts: Receipt[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(receipts));
}

export async function saveReceipt(receipt: Receipt): Promise<void> {
  const all = await loadAll();
  all.unshift(receipt);
  await saveAll(all);
}

export async function updateReceipt(receipt: Receipt): Promise<void> {
  const all = await loadAll();
  const idx = all.findIndex(r => r.id === receipt.id);
  if (idx !== -1) all[idx] = receipt;
  await saveAll(all);
}

export async function deleteReceipt(id: string): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter(r => r.id !== id));
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const all = await loadAll();
  return all.find(r => r.id === id) ?? null;
}

export async function getReceiptsByMonth(month: string): Promise<Receipt[]> {
  const all = await loadAll();
  return all.filter(r => r.date.startsWith(month));
}

export async function getAllReceipts(): Promise<Receipt[]> {
  return loadAll();
}

export async function getAvailableMonths(): Promise<string[]> {
  const all = await loadAll();
  const months = new Set(all.map(r => r.date.slice(0, 7)));
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export async function getMonthlySummary(months: string[]): Promise<MonthSummary[]> {
  if (months.length === 0) return [];
  const all = await loadAll();
  return months.map(month => {
    const rows = all.filter(r => r.date.startsWith(month));
    return buildSummary(month, rows);
  });
}

function buildSummary(month: string, rows: Receipt[]): MonthSummary {
  return {
    month,
    fuel95: aggregateReceipts(rows.filter(r => r.fuelType === '95')),
    fuel98: aggregateReceipts(rows.filter(r => r.fuelType === '98')),
    combined: aggregateReceipts(rows),
  };
}

function aggregateReceipts(rows: Receipt[]): FuelSummary {
  const gross = rows.reduce((s, r) => s + r.grossAmount, 0);
  const net = rows.reduce((s, r) => s + r.netAmount, 0);
  const vat = rows.reduce((s, r) => s + r.vatAmount, 0);
  const liters = rows.reduce((s, r) => s + r.liters, 0);
  return {
    grossAmount: round2(gross),
    netAmount: round2(net),
    vatAmount: round2(vat),
    liters: round2(liters),
    avgPricePerLiter: liters > 0 ? round2(gross / liters) : 0,
    count: rows.length,
  };
}
