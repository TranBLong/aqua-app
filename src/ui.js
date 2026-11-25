import React from 'react';
import {
  ActivityIndicator, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, busy, disabled, style }) {
  return (
    <TouchableOpacity
      style={[styles.btnPrimary, (busy || disabled) && { opacity: 0.6 }, style]}
      onPress={onPress}
      disabled={busy || disabled}
    >
      {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function DangerButton({ title, onPress, busy, disabled, style }) {
  return (
    <TouchableOpacity
      style={[styles.btnDanger, (busy || disabled) && { opacity: 0.6 }, style]}
      onPress={onPress}
      disabled={busy || disabled}
    >
      {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = 'muted' }) {
  const map = {
    online: { bg: colors.onlineBg, color: colors.success },
    offline: { bg: colors.offlineBg, color: colors.offline },
    alert: { bg: colors.alertBg, color: colors.error },
    muted: { bg: '#eef3f6', color: colors.muted },
  };
  const t = map[tone] || map.muted;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.color, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!hint && <Text style={styles.emptyHint}>{hint}</Text>}
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  const isNetwork = /mạng|kết nối|API|WiFi|timeout|AbortError|phản hồi quá lâu/i.test(message);
  return (
    <View style={[styles.banner, isNetwork && styles.bannerNetwork]}>
      <Text style={styles.bannerText}>{isNetwork ? '📡 Mất kết nối API — ' : ''}{message}</Text>
    </View>
  );
}

export function ScreenLoading({ label }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!!label && <Text style={styles.loadingLabel}>{label}</Text>}
    </View>
  );
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: 14,
    ...shadow,
  },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center' },
  btnDanger: { backgroundColor: colors.error, borderRadius: radius.md, padding: 15, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  emptyWrap: { alignItems: 'center', marginTop: 40, paddingHorizontal: 16 },
  emptyTitle: { color: colors.muted, textAlign: 'center' },
  emptyHint: { color: colors.muted, marginTop: 6, textAlign: 'center', fontSize: 13 },
  banner: {
    backgroundColor: colors.alertBg,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  bannerNetwork: { backgroundColor: '#fff3cd', borderColor: '#ffe08a' },
  bannerText: { color: colors.error, fontWeight: '600', textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingLabel: { color: colors.muted, marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: colors.primaryDark, marginBottom: 10 },
});
