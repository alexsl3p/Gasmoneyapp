import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, FlatList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { FuelBadge } from '@/components/ui/Badge';
import { getAllReceipts, deleteReceipt, getAvailableMonths } from '@/lib/storage';
import { Receipt, FuelType } from '@/lib/types';

function formatDate(d: string): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('et-EE', { month: 'short', year: '2-digit' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [filterFuel, setFilterFuel] = useState<FuelType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const all = await getAllReceipts();
    setReceipts(all);
    const m = await getAvailableMonths();
    setMonths(m);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = receipts.filter(r => {
    if (filterMonth && !r.date.startsWith(filterMonth)) return false;
    if (filterFuel && r.fuelType !== filterFuel) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    await deleteReceipt(id);
    load();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.count}>{filtered.length} receipts</Text>
      </View>

      {/* Fuel filter */}
      <View style={styles.filterRow}>
        {([null, '95', '98'] as (FuelType | null)[]).map(f => {
          const label = f === null ? 'All' : `Bensiin ${f}`;
          const accent = f === '95' ? Colors.fuel95 : f === '98' ? Colors.fuel98 : Colors.text;
          const active = filterFuel === f;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => setFilterFuel(f)}
              style={[styles.filterChip, active && { borderColor: accent, backgroundColor: `${accent}18` }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: active ? accent : Colors.muted }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Month filter */}
      {months.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthList}>
          <TouchableOpacity
            onPress={() => setFilterMonth(null)}
            style={[styles.monthChip, filterMonth === null && styles.monthChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.monthChipText, filterMonth === null && styles.monthChipTextActive]}>All</Text>
          </TouchableOpacity>
          {months.map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setFilterMonth(m)}
              style={[styles.monthChip, filterMonth === m && styles.monthChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthChipText, filterMonth === m && styles.monthChipTextActive]}>{formatMonth(m)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.fuel95} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.empty}>
            <Ionicons name="receipt-outline" size={44} color={Colors.subtle} />
            <Text style={styles.emptyText}>No receipts match your filters</Text>
          </MotiView>
        }
        renderItem={({ item: r, index }) => {
          const accent = r.fuelType === '95' ? Colors.fuel95 : Colors.fuel98;
          return (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 260, delay: index * 40 }}
              style={{ marginBottom: Spacing.sm }}
            >
              <TouchableOpacity onPress={() => router.push(`/edit/${r.id}`)} activeOpacity={0.75}>
                <Card>
                  <View style={styles.receiptHeader}>
                    <FuelBadge fuelType={r.fuelType} />
                    <Text style={styles.receiptDate}>{formatDate(r.date)}{r.time ? ` · ${r.time}` : ''}</Text>
                  </View>
                  {r.station && <Text style={styles.receiptStation}>{r.station}</Text>}
                  <View style={styles.receiptStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statVal}>{r.grossAmount.toFixed(2)} €</Text>
                      <Text style={styles.statLbl}>Gross</Text>
                    </View>
                    <View style={[styles.statDivider]} />
                    <View style={styles.statItem}>
                      <Text style={styles.statVal}>{r.netAmount.toFixed(2)} €</Text>
                      <Text style={styles.statLbl}>Net</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statVal, { color: accent }]}>{r.liters.toFixed(2)} L</Text>
                      <Text style={styles.statLbl}>Liters</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statVal}>{r.pricePerLiter.toFixed(3)}</Text>
                      <Text style={styles.statLbl}>€/L</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            </MotiView>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  count: { fontSize: FontSize.sm, color: Colors.muted },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: '600', letterSpacing: 0.3 },
  monthScroll: { marginBottom: Spacing.md },
  monthList: { paddingHorizontal: Spacing.xl, gap: Spacing.xs },
  monthChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  monthChipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  monthChipText: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '500' },
  monthChipTextActive: { color: Colors.background, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 24 },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  receiptDate: { fontSize: FontSize.xs, color: Colors.muted },
  receiptStation: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500', marginBottom: Spacing.md },
  receiptStats: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  statLbl: { fontSize: FontSize.xs, color: Colors.subtle, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyText: { fontSize: FontSize.md, color: Colors.subtle },
});
