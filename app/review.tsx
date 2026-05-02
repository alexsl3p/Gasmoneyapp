import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { saveReceipt } from '@/lib/storage';
import { calculateVat } from '@/lib/vat';
import { Receipt, FuelType } from '@/lib/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function Field({
  label, value, onChangeText, placeholder, keyboardType = 'default',
  warning,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  warning?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, warning && { color: Colors.warning }]}>{label}{warning ? ' *' : ''}</Text>
      <TextInput
        style={[styles.fieldInput, warning && !value && styles.fieldInputWarning]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={Colors.subtle}
        keyboardType={keyboardType}
        selectionColor={Colors.fuel95}
      />
    </View>
  );
}

function FuelToggle({ value, onChange }: { value: FuelType | ''; onChange: (v: FuelType) => void }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>Fuel Type *</Text>
      <View style={styles.toggleRow}>
        {(['95', '98'] as FuelType[]).map(t => {
          const accent = t === '95' ? Colors.fuel95 : Colors.fuel98;
          const active = value === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, { borderColor: active ? accent : Colors.border, backgroundColor: active ? `${accent}18` : 'transparent' }]}
              onPress={() => { Haptics.selectionAsync(); onChange(t); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, { color: active ? accent : Colors.muted }]}>
                Bensiin {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri: string; rawOcrText: string;
    date: string; time: string; station: string;
    fuelType: string; liters: string; grossAmount: string;
  }>();

  const [date, setDate] = useState(params.date ?? '');
  const [time, setTime] = useState(params.time ?? '');
  const [station, setStation] = useState(params.station ?? '');
  const [fuelType, setFuelType] = useState<FuelType | ''>(
    params.fuelType === '95' || params.fuelType === '98' ? params.fuelType : ''
  );
  const [liters, setLiters] = useState(params.liters ?? '');
  const [grossAmount, setGrossAmount] = useState(params.grossAmount ?? '');
  const [saving, setSaving] = useState(false);

  const litersNum = parseFloat(liters) || 0;
  const grossNum = parseFloat(grossAmount) || 0;
  const { net, vat } = calculateVat(grossNum);
  const pricePerLiter = litersNum > 0 && grossNum > 0 ? grossNum / litersNum : 0;

  const missingRequired = !date || !fuelType || litersNum === 0 || grossNum === 0;
  const missingOptional = !time || !station;

  const handleSave = async () => {
    if (!fuelType) { Alert.alert('Missing field', 'Please select a fuel type.'); return; }
    if (!date) { Alert.alert('Missing field', 'Please enter the date (YYYY-MM-DD).'); return; }
    if (litersNum === 0) { Alert.alert('Missing field', 'Please enter liters.'); return; }
    if (grossNum === 0) { Alert.alert('Missing field', 'Please enter the paid amount.'); return; }

    setSaving(true);
    try {
      const receipt: Receipt = {
        id: generateId(),
        date,
        time: time || undefined,
        station: station || undefined,
        fuelType,
        liters: litersNum,
        grossAmount: grossNum,
        netAmount: net,
        vatAmount: vat,
        pricePerLiter: Math.round(pricePerLiter * 1000) / 1000,
        imageUri: params.imageUri || undefined,
        rawOcrText: params.rawOcrText || undefined,
        createdAt: new Date().toISOString(),
      };
      await saveReceipt(receipt);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
      router.replace('/(tabs)/');
    } catch (e) {
      Alert.alert('Error', 'Could not save receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Review Receipt</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {missingRequired && (
            <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>Some required fields are missing or invalid</Text>
            </MotiView>
          )}
          {!missingRequired && missingOptional && (
            <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.muted} />
              <Text style={styles.infoText}>Time and station are optional but helpful</Text>
            </MotiView>
          )}

          <Text style={styles.sectionLabel}>DATE & LOCATION</Text>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" warning={!date} />
          <Field label="Time" value={time} onChangeText={setTime} placeholder="HH:mm" />
          <Field label="Station" value={station} onChangeText={setStation} placeholder="e.g. Pärnu ATM" />

          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>FUEL DETAILS</Text>
          <FuelToggle value={fuelType} onChange={setFuelType} />
          <Field label="Liters" value={liters} onChangeText={setLiters} placeholder="0.00" keyboardType="decimal-pad" warning={litersNum === 0} />
          <Field label="Paid (€)" value={grossAmount} onChangeText={setGrossAmount} placeholder="0.00" keyboardType="decimal-pad" warning={grossNum === 0} />

          {/* VAT summary */}
          {grossNum > 0 && (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.vatCard}>
              <Text style={styles.vatTitle}>VAT Breakdown (24%)</Text>
              <View style={styles.vatRow}>
                <Text style={styles.vatLabel}>Gross</Text>
                <Text style={styles.vatValue}>{grossNum.toFixed(2)} €</Text>
              </View>
              <View style={styles.vatRow}>
                <Text style={styles.vatLabel}>Net</Text>
                <Text style={styles.vatValue}>{net.toFixed(2)} €</Text>
              </View>
              <View style={styles.vatRow}>
                <Text style={styles.vatLabel}>VAT</Text>
                <Text style={[styles.vatValue, { color: Colors.warning }]}>{vat.toFixed(2)} €</Text>
              </View>
              {pricePerLiter > 0 && (
                <View style={[styles.vatRow, { marginTop: 4 }]}>
                  <Text style={styles.vatLabel}>Price/L</Text>
                  <Text style={[styles.vatValue, { color: Colors.success }]}>{pricePerLiter.toFixed(3)} €</Text>
                </View>
              )}
            </MotiView>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, missingRequired && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || missingRequired}
            activeOpacity={0.8}
          >
            {saving
              ? <Text style={styles.saveBtnText}>Saving…</Text>
              : <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.background} />
                  <Text style={styles.saveBtnText}>Approve & Save</Text>
                </>
            }
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
  title: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 120, paddingTop: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.subtle,
    letterSpacing: 1.2, marginBottom: Spacing.sm,
  },
  fieldWrap: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '500', marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, height: 48,
    paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  fieldInputWarning: { borderColor: Colors.warning },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleBtn: {
    flex: 1, height: 48, borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleText: { fontSize: FontSize.sm, fontWeight: '600' },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${Colors.warning}18`, borderRadius: Radius.md,
    borderWidth: 1, borderColor: `${Colors.warning}40`,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  warningText: { fontSize: FontSize.sm, color: Colors.warning, flex: 1 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  infoText: { fontSize: FontSize.sm, color: Colors.muted },
  vatCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.lg, marginTop: Spacing.lg, gap: 8,
  },
  vatTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.subtle, letterSpacing: 1, marginBottom: 4 },
  vatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vatLabel: { fontSize: FontSize.sm, color: Colors.muted },
  vatValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 32,
  },
  saveBtn: {
    height: 52, borderRadius: Radius.md, backgroundColor: Colors.success,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.background },
});
