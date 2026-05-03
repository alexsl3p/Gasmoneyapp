import * as SQLite from 'expo-sqlite';
import { Receipt, FuelSummary, MonthSummary } from './types';
import { round2 } from './vat';

const DB_NAME = 'fuelledger.db';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT,
      station TEXT,
      fuelType TEXT NOT NULL,
      liters REAL NOT NULL,
      grossAmount REAL NOT NULL,
      netAmount REAL NOT NULL,
      vatAmount REAL NOT NULL,
      pricePerLiter REAL NOT NULL,
      imageUri TEXT,
      rawOcrText TEXT,
      createdAt TEXT NOT NULL
    );
  `);
  return _db;
}

export async function saveReceipt(receipt: Receipt): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO receipts
      (id, date, time, station, fuelType, liters, grossAmount, netAmount, vatAmount, pricePerLiter, imageUri, rawOcrText, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    receipt.id, receipt.date, receipt.time ?? null, receipt.station ?? null,
    receipt.fuelType, receipt.liters, receipt.grossAmount, receipt.netAmount,
    receipt.vatAmount, receipt.pricePerLiter, receipt.imageUri ?? null,
    receipt.rawOcrText ?? null, receipt.createdAt,
  );
}

export async function updateReceipt(receipt: Receipt): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE receipts SET
      date=?, time=?, station=?, fuelType=?, liters=?, grossAmount=?, netAmount=?,
      vatAmount=?, pricePerLiter=?, imageUri=?, rawOcrText=?
     WHERE id=?`,
    receipt.date, receipt.time ?? null, receipt.station ?? null, receipt.fuelType,
    receipt.liters, receipt.grossAmount, receipt.netAmount, receipt.vatAmount,
    receipt.pricePerLiter, receipt.imageUri ?? null, receipt.rawOcrText ?? null,
    receipt.id,
  );
}

export async function deleteReceipt(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM receipts WHERE id=?', id);
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Receipt>('SELECT * FROM receipts WHERE id=?', id);
  return row ?? null;
}

export async function getReceiptsByMonth(month: string): Promise<Receipt[]> {
  const db = await getDb();
  return db.getAllAsync<Receipt>(
    "SELECT * FROM receipts WHERE date LIKE ? ORDER BY date DESC, time DESC",
    `${month}%`,
  );
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const db = await getDb();
  return db.getAllAsync<Receipt>('SELECT * FROM receipts ORDER BY date DESC, time DESC');
}

export async function getAvailableMonths(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ month: string }>(
    "SELECT DISTINCT substr(date, 1, 7) AS month FROM receipts ORDER BY month DESC",
  );
  return rows.map(r => r.month);
}

export async function getMonthlySummary(months: string[]): Promise<MonthSummary[]> {
  if (months.length === 0) return [];
  const db = await getDb();
  const results: MonthSummary[] = [];
  for (const month of months) {
    const rows = await db.getAllAsync<Receipt>(
      "SELECT * FROM receipts WHERE date LIKE ?",
      `${month}%`,
    );
    results.push(buildSummary(month, rows));
  }
  return results;
}

function buildSummary(month: string, rows: Receipt[]): MonthSummary {
  const fuel95 = rows.filter(r => r.fuelType === '95');
  const fuel98 = rows.filter(r => r.fuelType === '98');
  return {
    month,
    fuel95: aggregateReceipts(fuel95),
    fuel98: aggregateReceipts(fuel98),
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
