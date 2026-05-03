import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { FuelBadge } from '@/components/ui/Badge';
import { getMonthlySummary, getReceiptsByMonth, getAvailableMonths } from '@/lib/storage';
import { MonthSummary, Receipt } from '@/lib/types';

function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1);
  return d.toLocaleDateString('et-EE', { month: 'long', year: 'numeric' });
}

function formatDate(d: string): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

function FuelCard({ title, summary, accent }: { title: string; summary: any; accent: string }) {
  if (summary.count === 0) {
    return (
      <Card style={[styles.fuelCard, { borderColor: `${accent}30` }]}>
        <Text style={[styles.fuelCardTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.emptyLabel}>No entries this month</Text>
      </Card>
    );
  }
  return (
    <Card style={[styles.fuelCard, { borderColor: `${accent}30` }]}>
      <View style={styles.fuelCardHeader}>
        <Text style={[styles.fuelCardTitle, { color: accent }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: `${accent}18` }]}>
          <Text style={[styles.countText, { color: accent }]}>{summary.count} fill-ups</Text>
        </View>
      </View>
      <Text style={styles.grossAmount}>{summary.grossAmount.toFixed(2)} €</Text>
      <View style={styles.divider} />
      <StatRow label="Net" value={`${summary.netAmount.toFixed(2)} €`} />
      <StatRow label="VAT (24%)" value={`${summary.vatAmount.toFixed(2)} €`} />
      <StatRow label="Liters" value={`${summary.liters.toFixed(2)} L`} />
      <StatRow label="Avg price" value={`${summary.avgPricePerLiter.toFixed(3)} €/L`} accent={accent} />
    </Card>
  );
}

function ReceiptRow({ receipt, onPress }: { receipt: Receipt; onPress: () => void }) {
  const accent = receipt.fuelType === '95' ? Colors.fuel95 : Colors.fuel98;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.receiptRow}>
      <View style={[styles.fuelDot, { backgroundColor: accent }]} />
      <View style={styles.receiptMeta}>
        <Text style={styles.receiptStation} numberOfLines={1}>
          {receipt.station || 'Unknown station'}
        </Text>
        <Text style={styles.receiptDate}>{formatDate(receipt.date)}{receipt.time ? ` · ${receipt.time}` : ''}</Text>
      </View>
      <View style={styles.receiptRight}>
        <Text style={styles.receiptAmount}>{receipt.grossAmount.toFixed(2)} €</Text>
        <Text style={styles.receiptLiters}>{receipt.liters.toFixed(2)} L</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const available = await getAvailableMonths();
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const all = available.includes(current) ? available : [current, ...available];
    setMonths(all);
    const target = selectedMonth || current;
    setSelectedMonth(target);
    const [s] = await getMonthlySummary([target]);
    setSummary(s);
    const receipts = await getReceiptsByMonth(target);
    setRecentReceipts(receipts.slice(0, 10));
  }, [selectedMonth]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleMonthSelect = async (m: string) => {
    setSelectedMonth(m);
    const [s] = await getMonthlySummary([m]);
    setSummary(s);
    const receipts = await getReceiptsByMonth(m);
    setRecentReceipts(receipts.slice(0, 10));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Fuel Ledger</Text>
          <Text style={styles.headerSub}>Track your fuel costs</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => router.push('/upload')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.fuel95} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthList}>
          {months.map((m) => (
            <Pressable
              key={m}
              onPress={() => handleMonthSelect(m)}
              style={[styles.monthChip, m === selectedMonth && styles.monthChipActive]}
            >
              <Text style={[styles.monthChipText, m === selectedMonth && styles.monthChipTextActive]}>
                {formatMonth(m)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {summary && (
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total spent</Text>
            <Text style={styles.totalAmount}>{summary.combined.grossAmount.toFixed(2)} €</Text>
            <View style={styles.totalRow}>
              <View style={styles.totalStat}>
                <Text style={styles.totalStatLabel}>Net</Text>
                <Text style={styles.totalStatValue}>{summary.combined.netAmount.toFixed(2)} €</Text>
              </View>
              <View style={styles.totalStatDivider} />
              <View style={styles.totalStat}>
                <Text style={styles.totalStatLabel}>VAT</Text>
                <Text style={styles.totalStatValue}>{summary.combined.vatAmount.toFixed(2)} €</Text>
              </View>
              <View style={styles.totalStatDivider} />
              <View style={styles.totalStat}>
                <Text style={styles.totalStatLabel}>Liters</Text>
                <Text style={styles.totalStatValue}>{summary.combined.liters.toFixed(2)} L</Text>
              </View>
            </View>
          </Card>
        )}

        {summary && (
          <View style={styles.fuelRow}>
            <View style={{ flex: 1 }}>
              <FuelCard title="95" summary={summary.fuel95} accent={Colors.fuel95} />
            </View>
            <View style={{ flex: 1 }}>
              <FuelCard title="98" summary={summary.fuel98} accent={Colors.fuel98} />
            </View>
          </View>
        )}

        {recentReceipts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent receipts</Text>
            <Card padding={0} style={styles.recentCard}>
              {recentReceipts.map((r, i) => (
                <View key={r.id}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <ReceiptRow receipt={r} onPress={() => router.push(`/edit/${r.id}`)} />
                </View>
              ))}
            </Card>
          </>
        )}

        {recentReceipts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={Colors.subtle} />
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyDesc}>Tap + to upload your first fuel receipt screenshot</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg,
  },
  appName: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },
  uploadBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.fuel95, alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 32 },
  monthScroll: { marginHorizontal: -Spacing.xl, marginBottom: Spacing.lg },
  monthList: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  monthChipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  monthChipText: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: '500' },
  monthChipTextActive: { color: Colors.background, fontWeight: '600' },
  totalCard: { marginBottom: Spacing.lg },
  totalLabel: { fontSize: FontSize.sm, color: Colors.muted, marginBottom: Spacing.sm },
  totalAmount: { fontSize: FontSize.display, fontWeight: '700', color: Colors.text, letterSpacing: -1, marginBottom: Spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'center' },
  totalStat: { flex: 1, alignItems: 'center' },
  totalStatLabel: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: 4 },
  totalStatValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  totalStatDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  fuelRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  fuelCard: { flex: 1 },
  fuelCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  fuelCardTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  countText: { fontSize: FontSize.xs, fontWeight: '600' },
  grossAmount: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted },
  statValue: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '500' },
  emptyLabel: { fontSize: FontSize.sm, color: Colors.subtle, marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  recentCard: { marginBottom: Spacing.xl },
  receiptRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg,
  },
  fuelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  receiptMeta: { flex: 1 },
  receiptStation: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500', marginBottom: 3 },
  receiptDate: { fontSize: FontSize.xs, color: Colors.muted },
  receiptRight: { alignItems: 'flex-end' },
  receiptAmount: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  receiptLiters: { fontSize: FontSize.xs, color: Colors.muted },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.muted },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.subtle, textAlign: 'center', lineHeight: 20 },
});
