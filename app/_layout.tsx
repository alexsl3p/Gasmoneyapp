import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={styles.errRoot} contentContainerStyle={styles.errContent}>
          <Text style={styles.errTitle}>Crash Report</Text>
          <Text style={styles.errMsg}>{err.message}</Text>
          <Text style={styles.errStack}>{err.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="upload" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="review" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="edit/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errRoot: { flex: 1, backgroundColor: '#0a0a0a' },
  errContent: { padding: 20, paddingTop: 60 },
  errTitle: { color: '#ff4444', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  errMsg: { color: '#ffffff', fontSize: 14, marginBottom: 16, fontWeight: '600' },
  errStack: { color: '#aaaaaa', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});
