import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { getReceiptById, updateReceipt, deleteReceipt } from '@/lib/storage';
import { calculateVat } from '@/lib/vat';
import { Receipt, FuelType } from '@/lib/types';

function Field({ label, value, onChangeText, keyboardType = 'default' }: {
  label: string; value: string; onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.subtle}
        keyboardType={keyboardType}
        selectionColor={Colors.fuel95}
      />
    </View>
  );
}

export default function EditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [station, setStation] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('98');
  const [liters, setLiters] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReceiptById(id).then(r => {
      if (!r) return;
      setReceipt(r);
      setDate(r.date);
      setTime(r.time ?? '');
      setStation(r.station ?? '');
      setFuelType(r.fuelType);
      setLiters(r.liters.toString());
      setGrossAmount(r.grossAmount.toString());
    });
  }, [id]);

  const litersNum = parseFloat(liters) || 0;
  const grossNum = parseFloat(grossAmount) || 0;
  const { net, vat } = calculateVat(grossNum);
  const pricePerLiter = litersNum > 0 && grossNum > 0 ? grossNum / litersNum : 0;

  const handleSave = async () => {
    if (!receipt) return;
    setSaving(true);
    try {
      const updated: Receipt = {
        ...receipt,
        date, time: time || undefined, station: station || undefined, fuelType,
        liters: litersNum, grossAmount: grossNum, netAmount: net, vatAmount: vat,
        pricePerLiter: Math.round(pricePerLiter * 1000) / 1000,
      };
      await updateReceipt(updated);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not update receipt.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete receipt', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteReceipt(id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
      },
    ]);
  };

  if (!receipt) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.muted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Receipt</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>DATE & LOCATION</Text>
          <Field label="Date" value={date} onChangeText={setDate} />
          <Field label="Time" value={time} onChangeText={setTime} />
          <Field label="Station" value={station} onChangeText={setStation} />

          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>FUEL DETAILS</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Fuel Type</Text>
            <View style={styles.toggleRow}>
              {(['95', '98'] as FuelType[]).map(t => {
                const accent = t === '95' ? Colors.fuel95 : Colors.fuel98;
                const active = fuelType === t;
                return (
                  <TouchableOpacity key={t}
                    style={[styles.toggleBtn, { borderColor: active ? accent : Colors.border, backgroundColor: active ? `${accent}18` : 'transparent' }]}
                    onPress={() => { Haptics.selectionAsync(); setFuelType(t); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleText, { color: active ? accent : Colors.muted }]}>Bensiin {t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Field label="Liters" value={liters} onChangeText={setLiters} keyboardType="decimal-pad" />
          <Field label="Paid (€)" value={grossAmount} onChangeText={setGrossAmount} keyboardType="decimal-pad" />

          {grossNum > 0 && (
            <View style={styles.vatCard}>
              <Text style={styles.vatTitle}>VAT BREAKDOWN (24%)</Text>
              {([
                ['Gross', `${grossNum.toFixed(2)} €`],
                ['Net', `${net.toFixed(2)} €`],
                ['VAT', `${vat.toFixed(2)} €`],
                ...(pricePerLiter > 0 ? [['Price/L', `${pricePerLiter.toFixed(3)} €`]] : []),
              ] as [string, string][]).map(([l, v]) => (
                <View key={l} style={styles.vatRow}>
                  <Text style={styles.vatLabel}>{l}</Text>
                  <Text style={styles.vatValue}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.background} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 120, paddingTop: Spacing.lg },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.subtle, letterSpacing: 1.2, marginBottom: Spacing.sm },
  fieldWrap: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '500', marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, height: 48,
    paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleBtn: { flex: 1, height: 48, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: FontSize.sm, fontWeight: '600' },
  vatCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginTop: Spacing.lg, gap: 8 },
  vatTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.subtle, letterSpacing: 1, marginBottom: 4 },
  vatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vatLabel: { fontSize: FontSize.sm, color: Colors.muted },
  vatValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 32 },
  saveBtn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.fuel95, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.background },
});
