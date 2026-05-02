import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { ScanningOverlay, Shimmer } from '@/components/animations/ShimmerEffect';
import { runOCR } from '@/lib/ocr';
import { ParsedReceipt } from '@/lib/types';

type Stage = 'idle' | 'picked' | 'scanning' | 'done';

export default function UploadScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [parsed, setParsed] = useState<ParsedReceipt>({});
  const [rawText, setRawText] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow gallery access to pick receipt screenshots.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setStage('picked');
  };

  const startScan = async () => {
    if (!imageUri) return;
    setStage('scanning');
    try {
      const { raw, parsed: p } = await runOCR(imageUri);
      setRawText(raw);
      setParsed(p);
    } catch (e) {
      setParsed({});
      setRawText('');
    }
    setStage('done');
  };

  const goToReview = () => {
    router.push({
      pathname: '/review',
      params: {
        imageUri: imageUri ?? '',
        rawOcrText: rawText,
        date: parsed.date ?? '',
        time: parsed.time ?? '',
        station: parsed.station ?? '',
        fuelType: parsed.fuelType ?? '',
        liters: parsed.liters?.toString() ?? '',
        grossAmount: parsed.grossAmount?.toString() ?? '',
      },
    });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image preview / picker area */}
        <TouchableOpacity
          onPress={stage === 'idle' ? pickImage : undefined}
          activeOpacity={stage === 'idle' ? 0.7 : 1}
          style={[styles.imageBox, imageUri ? styles.imageBoxFilled : styles.imageBoxEmpty]}
        >
          {imageUri ? (
            <View style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
              {stage === 'scanning' && <ScanningOverlay />}
            </View>
          ) : (
            <View style={styles.pickerPlaceholder}>
              <MotiView
                from={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', loop: true, repeatReverse: true, duration: 1800 }}
              >
                <Ionicons name="image-outline" size={56} color={Colors.subtle} />
              </MotiView>
              <Text style={styles.placeholderTitle}>Pick a screenshot</Text>
              <Text style={styles.placeholderDesc}>Tap to select a fuel receipt from your gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Status text */}
        {stage === 'scanning' && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.statusBox}
          >
            <ActivityIndicator color={Colors.fuel95} size="small" />
            <Text style={styles.statusText}>Scanning receipt with ML Kit…</Text>
          </MotiView>
        )}

        {stage === 'done' && (
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.parsedBox}>
            <View style={styles.parsedHeader}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.parsedTitle}>OCR complete — review & confirm fields</Text>
            </View>
            <View style={styles.parsedFields}>
              {parsed.date && <PField label="Date" value={parsed.date} />}
              {parsed.time && <PField label="Time" value={parsed.time} />}
              {parsed.station && <PField label="Station" value={parsed.station} />}
              {parsed.fuelType && <PField label="Fuel" value={`Bensiin ${parsed.fuelType}`} />}
              {parsed.liters != null && <PField label="Liters" value={`${parsed.liters} L`} />}
              {parsed.grossAmount != null && <PField label="Paid" value={`${parsed.grossAmount} €`} />}
            </View>
            {Object.keys(parsed).length === 0 && (
              <Text style={styles.noFieldsText}>No fields extracted automatically — fill them in manually.</Text>
            )}
          </MotiView>
        )}

        {/* Shimmer skeleton while scanning */}
        {stage === 'scanning' && (
          <View style={styles.shimmerWrap}>
            {[100, 140, 80, 120].map((w, i) => (
              <Shimmer key={i} width={w} height={14} style={{ marginBottom: 10 }} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.footer}>
        {stage === 'idle' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={pickImage} activeOpacity={0.8}>
            <Ionicons name="image" size={20} color={Colors.background} />
            <Text style={styles.primaryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        )}
        {stage === 'picked' && (
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.ghostBtn} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.ghostBtnText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={startScan} activeOpacity={0.8}>
              <Ionicons name="scan" size={20} color={Colors.background} />
              <Text style={styles.primaryBtnText}>Scan Receipt</Text>
            </TouchableOpacity>
          </View>
        )}
        {stage === 'done' && (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.success }]} onPress={goToReview} activeOpacity={0.8}>
            <Ionicons name="arrow-forward" size={20} color={Colors.background} />
            <Text style={styles.primaryBtnText}>Review & Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pField}>
      <Text style={styles.pLabel}>{label}</Text>
      <Text style={styles.pValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 120 },
  imageBox: {
    borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1.5, borderStyle: 'dashed',
    marginBottom: Spacing.lg,
  },
  imageBoxEmpty: { height: 280, borderColor: Colors.subtle, alignItems: 'center', justifyContent: 'center' },
  imageBoxFilled: { height: 340, borderColor: Colors.border },
  preview: { width: '100%', height: '100%' },
  pickerPlaceholder: { alignItems: 'center', gap: 10 },
  placeholderTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.muted },
  placeholderDesc: { fontSize: FontSize.sm, color: Colors.subtle, textAlign: 'center', lineHeight: 20 },
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  statusText: { fontSize: FontSize.sm, color: Colors.muted },
  shimmerWrap: { gap: 0, paddingHorizontal: 4 },
  parsedBox: {
    backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1,
    borderColor: `${Colors.success}30`, padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  parsedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  parsedTitle: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  parsedFields: { gap: 8 },
  pField: { flexDirection: 'row', justifyContent: 'space-between' },
  pLabel: { fontSize: FontSize.sm, color: Colors.muted },
  pValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  noFieldsText: { fontSize: FontSize.sm, color: Colors.warning },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 32,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.sm },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: Radius.md, backgroundColor: Colors.fuel95,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.background },
  ghostBtn: {
    height: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl,
  },
  ghostBtnText: { fontSize: FontSize.md, color: Colors.muted, fontWeight: '500' },
});
