import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { getMonthlySummary, getAvailableMonths } from '@/lib/storage';
import { MonthSummary } from '@/lib/types';
import { round2 } from '@/lib/vat';

function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('et-EE', { month: 'long', year: 'numeric' });
}

function SummarySection({ label, summary, accent }: { label: string; summary: any; accent: string }) {
  if (summary.count === 0) return null;
  return (
    <View style={styles.fuelSection}>
      <View style={[styles.fuelDot, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.fuelSectionTitle, { color: accent }]}>{label}</Text>
        <View style={styles.fuelGrid}>
          {[
            ['Gross', `${summary.grossAmount.toFixed(2)} €`],
            ['Net', `${summary.netAmount.toFixed(2)} €`],
            ['VAT', `${summary.vatAmount.toFixed(2)} €`],
            ['Liters', `${summary.liters.toFixed(2)} L`],
            ['Avg €/L', `${summary.avgPricePerLiter.toFixed(3)}`],
            ['Fill-ups', `${summary.count}`],
          ].map(([l, v]) => (
            <View key={l} style={styles.gridCell}>
              <Text style={styles.gridVal}>{v}</Text>
              <Text style={styles.gridLbl}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function SummaryScreen() {
  const [months, setMonths] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const m = await getAvailableMonths();
    setMonths(m);
    if (m.length > 0 && selected.size === 0) {
      const initial = new Set([m[0]]);
      setSelected(initial);
      const s = await getMonthlySummary([m[0]]);
      setSummaries(s);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleMonth = async (m: string) => {
    const next = new Set(selected);
    if (next.has(m)) { next.delete(m); } else { next.add(m); }
    setSelected(next);
    const arr = Array.from(next);
    const s = await getMonthlySummary(arr);
    setSummaries(s);
  };

  // Aggregate across all selected months
  const aggregate = summaries.reduce(
    (acc, s) => ({
      gross: round2(acc.gross + s.combined.grossAmount),
      net: round2(acc.net + s.combined.netAmount),
      vat: round2(acc.vat + s.combined.vatAmount),
      liters: round2(acc.liters + s.combined.liters),
      gross95: round2(acc.gross95 + s.fuel95.grossAmount),
      net95: round2(acc.net95 + s.fuel95.netAmount),
      vat95: round2(acc.vat95 + s.fuel95.vatAmount),
      liters95: round2(acc.liters95 + s.fuel95.liters),
      count95: acc.count95 + s.fuel95.count,
      gross98: round2(acc.gross98 + s.fuel98.grossAmount),
      net98: round2(acc.net98 + s.fuel98.netAmount),
      vat98: round2(acc.vat98 + s.fuel98.vatAmount),
      liters98: round2(acc.liters98 + s.fuel98.liters),
      count98: acc.count98 + s.fuel98.count,
    }),
    {
      gross: 0, net: 0, vat: 0, liters: 0,
      gross95: 0, net95: 0, vat95: 0, liters95: 0, count95: 0,
      gross98: 0, net98: 0, vat98: 0, liters98: 0, count98: 0,
    },
  );

  const avg95 = aggregate.liters95 > 0 ? round2(aggregate.gross95 / aggregate.liters95) : 0;
  const avg98 = aggregate.liters98 > 0 ? round2(aggregate.gross98 / aggregate.liters98) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Summary</Text>
        <Text style={styles.subtitle}>{selected.size} month{selected.size !== 1 ? 's' : ''} selected</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.fuel95} />}
      >
        {/* Month multi-select */}
        {months.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={44} color={Colors.subtle} />
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>SELECT MONTHS</Text>
            <View style={styles.monthGrid}>
              {months.map((m, i) => {
                const active = selected.has(m);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => toggleMonth(m)}
                    style={[styles.monthChip, active && styles.monthChipActive]}
                    activeOpacity={0.7}
                  >
                    {active && <Ionicons name="checkmark" size={12} color={Colors.background} style={{ marginRight: 4 }} />}
                    <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{formatMonth(m)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selected.size > 0 && aggregate.gross > 0 && (
              <>
                {/* Total */}
                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Total Fuel Cost</Text>
                    <Text style={styles.totalGross}>{aggregate.gross.toFixed(2)} €</Text>
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                      <View style={styles.totalStat}>
                        <Text style={styles.totalStatVal}>{aggregate.net.toFixed(2)} €</Text>
                        <Text style={styles.totalStatLbl}>Net</Text>
                      </View>
                      <View style={styles.totalStatDivider} />
                      <View style={styles.totalStat}>
                        <Text style={styles.totalStatVal}>{aggregate.vat.toFixed(2)} €</Text>
                        <Text style={styles.totalStatLbl}>VAT (24%)</Text>
                      </View>
                      <View style={styles.totalStatDivider} />
                      <View style={styles.totalStat}>
                        <Text style={styles.totalStatVal}>{aggregate.liters.toFixed(2)} L</Text>
                        <Text style={styles.totalStatLbl}>Liters</Text>
                      </View>
                    </View>
                  </Card>

                {/* Per-fuel breakdown */}
                <Card style={styles.breakdownCard}>
                    <Text style={styles.sectionLabel}>BREAKDOWN BY FUEL</Text>

                    <SummarySection
                      label="Bensiin 95"
                      accent={Colors.fuel95}
                      summary={{ ...aggregate, grossAmount: aggregate.gross95, netAmount: aggregate.net95, vatAmount: aggregate.vat95, liters: aggregate.liters95, avgPricePerLiter: avg95, count: aggregate.count95 }}
                    />

                    {aggregate.count95 > 0 && aggregate.count98 > 0 && (
                      <View style={[styles.divider, { marginVertical: Spacing.md }]} />
                    )}

                    <SummarySection
                      label="Bensiin 98"
                      accent={Colors.fuel98}
                      summary={{ ...aggregate, grossAmount: aggregate.gross98, netAmount: aggregate.net98, vatAmount: aggregate.vat98, liters: aggregate.liters98, avgPricePerLiter: avg98, count: aggregate.count98 }}
                    />
                  </Card>

                {/* Per-month breakdown */}
                {summaries.length > 1 && (
                    <Card>
                      <Text style={styles.sectionLabel}>MONTH BY MONTH</Text>
                      {summaries.map((s, i) => (
                        <View key={s.month}>
                          {i > 0 && <View style={[styles.divider, { marginVertical: Spacing.md }]} />}
                          <View style={styles.monthSummaryRow}>
                            <Text style={styles.monthSummaryLabel}>{formatMonth(s.month)}</Text>
                            <View style={styles.monthSummaryRight}>
                              <Text style={styles.monthSummaryGross}>{s.combined.grossAmount.toFixed(2)} €</Text>
                              <Text style={styles.monthSummaryLiters}>{s.combined.liters.toFixed(2)} L</Text>
                            </View>
                          </View>
                          <View style={styles.monthFuelRow}>
                            {s.fuel95.count > 0 && (
                              <View style={[styles.fuelPill, { borderColor: `${Colors.fuel95}50` }]}>
                                <Text style={[styles.fuelPillText, { color: Colors.fuel95 }]}>95 · {s.fuel95.grossAmount.toFixed(2)} €</Text>
                              </View>
                            )}
                            {s.fuel98.count > 0 && (
                              <View style={[styles.fuelPill, { borderColor: `${Colors.fuel98}50` }]}>
                                <Text style={[styles.fuelPillText, { color: Colors.fuel98 }]}>98 · {s.fuel98.grossAmount.toFixed(2)} €</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </Card>
                )}
              </>
            )}

            {selected.size > 0 && aggregate.gross === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No receipts in selected months</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 32 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.subtle, letterSpacing: 1.2, marginBottom: Spacing.md },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  monthChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  monthChipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  monthChipText: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '500' },
  monthChipTextActive: { color: Colors.background, fontWeight: '600' },
  totalCard: { marginBottom: Spacing.md },
  totalLabel: { fontSize: FontSize.sm, color: Colors.muted, marginBottom: Spacing.sm },
  totalGross: { fontSize: FontSize.display, fontWeight: '700', color: Colors.text, letterSpacing: -1, marginBottom: Spacing.lg },
  divider: { height: 1, backgroundColor: Colors.border },
  totalRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },
  totalStat: { flex: 1, alignItems: 'center' },
  totalStatVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600', marginBottom: 3 },
  totalStatLbl: { fontSize: FontSize.xs, color: Colors.muted },
  totalStatDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  breakdownCard: { marginBottom: Spacing.md },
  fuelSection: { flexDirection: 'row', gap: Spacing.md },
  fuelDot: { width: 3, borderRadius: 2, marginTop: 2, alignSelf: 'stretch' },
  fuelSectionTitle: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.md },
  fuelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridCell: { width: '30%', marginBottom: 4 },
  gridVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  gridLbl: { fontSize: FontSize.xs, color: Colors.subtle, marginTop: 2 },
  monthSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthSummaryLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  monthSummaryRight: { alignItems: 'flex-end' },
  monthSummaryGross: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  monthSummaryLiters: { fontSize: FontSize.xs, color: Colors.muted },
  monthFuelRow: { flexDirection: 'row', gap: Spacing.sm },
  fuelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  fuelPillText: { fontSize: FontSize.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyText: { fontSize: FontSize.md, color: Colors.subtle },
});
