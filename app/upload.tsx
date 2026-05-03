import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, ScrollView, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { ScanningOverlay, Shimmer } from '@/components/animations/ShimmerEffect';
import { runOCR } from '@/lib/ocr';
import { t } from '@/lib/i18n';
import { ParsedReceipt } from '@/lib/types';

type ScanResult = { uri: string; raw: string; parsed: ParsedReceipt };
type Stage = 'idle' | 'picked' | 'scanning' | 'done';

export default function UploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('idle');
  const [scanningIdx, setScanningIdx] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionRequired'), t('galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets.length) return;
    setImages(result.assets.map(a => a.uri));
    setResults([]);
    setStage('picked');
  };

  const startScanAll = async () => {
    if (!images.length) return;
    setStage('scanning');
    const scanned: ScanResult[] = [];
    for (let i = 0; i < images.length; i++) {
      setScanningIdx(i);
      try {
        const { raw, parsed } = await runOCR(images[i]);
        scanned.push({ uri: images[i], raw, parsed });
      } catch {
        scanned.push({ uri: images[i], raw: '', parsed: {} });
      }
    }
    setResults(scanned);
    setStage('done');
  };

  const goToReview = (result: ScanResult, remaining: ScanResult[]) => {
    router.push({
      pathname: '/review',
      params: {
        imageUri: result.uri,
        rawOcrText: result.raw,
        date: result.parsed.date ?? '',
        time: result.parsed.time ?? '',
        station: result.parsed.station ?? '',
        fuelType: result.parsed.fuelType ?? '',
        liters: result.parsed.liters?.toString() ?? '',
        grossAmount: result.parsed.grossAmount?.toString() ?? '',
        queue: remaining.length ? JSON.stringify(remaining) : '',
      },
    });
  };

  const footerPad = insets.bottom + 16;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('uploadTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 80 + footerPad }]} showsVerticalScrollIndicator={false}>

        {/* Image area */}
        {stage === 'idle' && (
          <TouchableOpacity onPress={pickImages} activeOpacity={0.7} style={styles.imageBoxEmpty}>
            <Ionicons name="images-outline" size={56} color={Colors.subtle} />
            <Text style={styles.placeholderTitle}>{t('pickScreenshot')}</Text>
            <Text style={styles.placeholderDesc}>{t('pickDesc')}</Text>
          </TouchableOpacity>
        )}

        {/* Thumbnail strip for picked images */}
        {(stage === 'picked' || stage === 'scanning' || stage === 'done') && images.length > 0 && (
          <View style={styles.thumbSection}>
            <Text style={styles.thumbCount}>{images.length} {t('selected')}</Text>
            <FlatList
              data={images}
              horizontal
              keyExtractor={(_, i) => String(i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbList}
              renderItem={({ item, index }) => {
                const scanned = results[index];
                const isScanning = stage === 'scanning' && index === scanningIdx;
                const isDone = !!scanned;
                return (
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: item }} style={styles.thumb} />
                    {isScanning && (
                      <View style={styles.thumbOverlay}>
                        <ActivityIndicator color={Colors.fuel95} size="small" />
                      </View>
                    )}
                    {isDone && !isScanning && (
                      <View style={[styles.thumbBadge, { backgroundColor: Object.keys(scanned.parsed).length > 0 ? Colors.success : Colors.warning }]}>
                        <Ionicons name={Object.keys(scanned.parsed).length > 0 ? 'checkmark' : 'alert'} size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}

        {/* Scanning progress */}
        {stage === 'scanning' && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={Colors.fuel95} size="small" />
            <Text style={styles.statusText}>
              {t('scanning')} {scanningIdx + 1}/{images.length}…
            </Text>
          </View>
        )}

        {/* Results list */}
        {stage === 'done' && results.map((r, i) => {
          const hasFields = Object.keys(r.parsed).length > 0;
          return (
            <View key={i} style={[styles.resultCard, { borderColor: hasFields ? `${Colors.success}40` : `${Colors.warning}40` }]}>
              <View style={styles.resultHeader}>
                <Image source={{ uri: r.uri }} style={styles.resultThumb} />
                <View style={{ flex: 1 }}>
                  {hasFields ? (
                    <>
                      {r.parsed.date && <Text style={styles.resultVal}>{r.parsed.date}{r.parsed.time ? ` · ${r.parsed.time}` : ''}</Text>}
                      {r.parsed.station && <Text style={styles.resultStation}>{r.parsed.station}</Text>}
                      {r.parsed.fuelType && <Text style={[styles.resultFuel, { color: r.parsed.fuelType === '95' ? Colors.fuel95 : Colors.fuel98 }]}>Bensiin {r.parsed.fuelType}</Text>}
                      {r.parsed.liters != null && <Text style={styles.resultDetail}>{r.parsed.liters} L · {r.parsed.grossAmount} €</Text>}
                    </>
                  ) : (
                    <Text style={styles.resultNoFields}>{t('noFieldsExtracted')}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => goToReview(r, results.slice(i + 1))}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward" size={16} color={Colors.background} />
                <Text style={styles.reviewBtnText}>{t('reviewSave')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {stage === 'scanning' && (
          <View style={styles.shimmerWrap}>
            {[100, 140, 80, 120].map((w, i) => (
              <Shimmer key={i} width={w} height={14} style={{ marginBottom: 10 }} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        {(stage === 'idle' || stage === 'picked') && (
          <View style={styles.footerRow}>
            {stage === 'picked' && (
              <TouchableOpacity style={styles.ghostBtn} onPress={pickImages} activeOpacity={0.7}>
                <Text style={styles.ghostBtnText}>{t('changePhoto')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }, stage === 'idle' && { flex: 0, paddingHorizontal: 32 }]}
              onPress={stage === 'idle' ? pickImages : startScanAll}
              activeOpacity={0.8}
            >
              <Ionicons name={stage === 'idle' ? 'images' : 'scan'} size={20} color={Colors.background} />
              <Text style={styles.primaryBtnText}>
                {stage === 'idle' ? t('chooseGallery') : (images.length > 1 ? t('scanAll') : t('scanReceipt'))}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  content: { paddingHorizontal: Spacing.xl },
  imageBoxEmpty: {
    height: 260, borderRadius: Radius.xl, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: Colors.subtle, alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: Spacing.lg,
  },
  placeholderTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.muted },
  placeholderDesc: { fontSize: FontSize.sm, color: Colors.subtle, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  thumbSection: { marginBottom: Spacing.lg },
  thumbCount: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '600', marginBottom: Spacing.sm, letterSpacing: 0.5 },
  thumbList: { gap: Spacing.sm },
  thumbWrap: { width: 80, height: 80, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  statusText: { fontSize: FontSize.sm, color: Colors.muted },
  shimmerWrap: { gap: 0, paddingHorizontal: 4 },
  resultCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  resultHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  resultThumb: { width: 56, height: 56, borderRadius: Radius.sm },
  resultVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600', marginBottom: 2 },
  resultStation: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: 2 },
  resultFuel: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 2 },
  resultDetail: { fontSize: FontSize.xs, color: Colors.muted },
  resultNoFields: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '500' },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.success,
  },
  reviewBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.background },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
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
