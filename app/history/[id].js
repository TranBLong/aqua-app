import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/api';
import { auth } from '../../src/firebase';
import { API_URL } from '../../src/config';

const METRICS = [
  { key: 'temp', label: 'Nhiệt độ', unit: '°C', color: '#e67e22' },
  { key: 'ph', label: 'pH', unit: '', color: '#8e44ad' },
  { key: 'do', label: 'Oxy', unit: 'mg/L', color: '#0b6e99' },
  { key: 'turbidity', label: 'Độ đục', unit: '%', color: '#7f8c8d' },
];

const PRESETS = [
  { key: '24h', label: '24 giờ', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7 ngày', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30 ngày', ms: 30 * 24 * 60 * 60 * 1000 },
];

const INTERVALS = [
  { key: 'raw', label: 'Raw' },
  { key: 'hour', label: 'Giờ' },
  { key: 'day', label: 'Ngày' },
];

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTs(ts, rangeKey) {
  const d = new Date(ts);
  if (rangeKey === '24h') return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function formatFull(ts) {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultInterval(rangeKey) {
  if (rangeKey === '24h') return 'raw';
  if (rangeKey === '7d') return 'hour';
  return 'day';
}

export default function HistoryScreen() {
  const { id, name } = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [range, setRange] = useState('24h');
  const [interval, setInterval] = useState('raw');
  const [metric, setMetric] = useState('temp');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const rangeMs = PRESETS.find((p) => p.key === range)?.ms || PRESETS[0].ms;

  const load = useCallback(async (rangeKey, intervalKey) => {
    setError('');
    setData(null);
    const to = Date.now();
    const from = to - (PRESETS.find((p) => p.key === rangeKey)?.ms || PRESETS[0].ms);
    let iv = intervalKey;

    try {
      let res = await api(`/ponds/${id}/history?from=${from}&to=${to}&interval=${iv}&limit=1000`);

      if (rangeKey === '24h' && iv === 'raw' && res.count > 1500) {
        iv = 'hour';
        setInterval('hour');
        res = await api(`/ponds/${id}/history?from=${from}&to=${to}&interval=hour&limit=1000`);
      }

      setData(res.data || []);
    } catch (e) {
      setError(e.message);
      setData([]);
    }
  }, [id]);

  const onSelectRange = (key) => {
    const iv = defaultInterval(key);
    setRange(key);
    setInterval(iv);
    load(key, iv);
  };

  const onSelectInterval = (key) => {
    setInterval(key);
    load(range, key);
  };

  React.useEffect(() => {
    load(range, interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(range, interval);
    setRefreshing(false);
  };

  const m = METRICS.find((x) => x.key === metric);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .filter((r) => typeof r[metric] === 'number')
      .map((r) => ({
        value: r[metric],
        label: formatTs(r.ts, range),
      }));
  }, [data, metric, range]);

  const stats = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    if (!vals.length) return { min: null, avg: null, max: null };
    return {
      min: Math.min(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      max: Math.max(...vals),
    };
  }, [chartData]);

  const tableRows = useMemo(() => {
    if (!data) return [];
    return data.slice(-200).reverse();
  }, [data]);

  const labeledChart = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = Math.max(1, Math.floor(chartData.length / 5));
    return chartData.map((d, i) => ({
      ...d,
      label: i % step === 0 || i === chartData.length - 1 ? d.label : '',
      labelTextStyle: { color: '#778', fontSize: 10 },
    }));
  }, [chartData]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Bạn chưa đăng nhập');
      const token = await user.getIdToken();
      const to = Date.now();
      const from = to - rangeMs;
      const url = `${API_URL}/ponds/${id}/history/export?from=${from}&to=${to}`;
      const fileUri = `${FileSystem.cacheDirectory}aqua-history-${id}-${Date.now()}.csv`;

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        throw new Error(`Xuất CSV thất bại (HTTP ${result.status})`);
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Thành công', `Đã lưu file:\n${result.uri}`);
        return;
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Xuất lịch sử cảm biến',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (e) {
      Alert.alert('Không xuất được CSV', e.message || 'Lỗi không xác định');
    } finally {
      setExporting(false);
    }
  };

  const fmt = (v, key) => {
    if (typeof v !== 'number') return '--';
    if (key === 'ph' || key === 'do') return v.toFixed(2);
    if (key === 'turbidity') return v.toFixed(0);
    return v.toFixed(1);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name ? `Lịch sử · ${name}` : 'Lịch sử' }} />

      <FlatList
        data={tableRows}
        keyExtractor={(item, idx) => `${item.ts}-${idx}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.sectionLabel}>Khoảng thời gian</Text>
            <View style={styles.chipRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.chip, range === p.key && styles.chipActive]}
                  onPress={() => onSelectRange(p.key)}
                >
                  <Text style={[styles.chipText, range === p.key && styles.chipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Độ phân giải</Text>
            <View style={styles.chipRow}>
              {INTERVALS.map((iv) => (
                <TouchableOpacity
                  key={iv.key}
                  style={[styles.chip, interval === iv.key && styles.chipActive]}
                  onPress={() => onSelectInterval(iv.key)}
                >
                  <Text style={[styles.chipText, interval === iv.key && styles.chipTextActive]}>{iv.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Chỉ số</Text>
            <View style={styles.chipRow}>
              {METRICS.map((x) => (
                <TouchableOpacity
                  key={x.key}
                  style={[styles.chip, metric === x.key && { backgroundColor: x.color, borderColor: x.color }]}
                  onPress={() => setMetric(x.key)}
                >
                  <Text style={[styles.chipText, metric === x.key && { color: '#fff' }]}>{x.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
              onPress={exportCsv}
              disabled={exporting}
            >
              {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportText}>📥 Xuất CSV</Text>}
            </TouchableOpacity>

            {!!error && <Text style={styles.error}>{error}</Text>}

            {data === null && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0b6e99" />
                <Text style={styles.muted}>Đang tải lịch sử…</Text>
              </View>
            )}

            {data !== null && (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Min</Text>
                    <Text style={[styles.statValue, { color: m.color }]}>{stats.min == null ? '--' : fmt(stats.min, metric)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Trung bình</Text>
                    <Text style={[styles.statValue, { color: m.color }]}>{stats.avg == null ? '--' : fmt(stats.avg, metric)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Max</Text>
                    <Text style={[styles.statValue, { color: m.color }]}>{stats.max == null ? '--' : fmt(stats.max, metric)}</Text>
                  </View>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>
                    Biểu đồ {m.label} ({PRESETS.find((p) => p.key === range)?.label})
                  </Text>
                  {chartData.length < 2 ? (
                    <Text style={styles.empty}>Chưa đủ dữ liệu (&lt; 2 điểm). Hãy để thiết bị chạy thêm hoặc chọn khoảng rộng hơn.</Text>
                  ) : (
                    <LineChart
                      data={labeledChart}
                      width={width - 48}
                      height={200}
                      color={m.color}
                      thickness={2}
                      hideDataPoints={chartData.length > 40}
                      curved
                      areaChart
                      startFillColor={m.color}
                      endFillColor={m.color}
                      startOpacity={0.25}
                      endOpacity={0.02}
                      noOfSections={4}
                      yAxisTextStyle={{ color: '#778', fontSize: 11 }}
                      yAxisLabelWidth={40}
                      rulesColor="#e3edf2"
                      initialSpacing={8}
                      spacing={Math.max(2, (width - 80) / Math.max(labeledChart.length, 1))}
                      xAxisLabelTextStyle={{ color: '#778', fontSize: 10 }}
                      adjustToWidth
                    />
                  )}
                  <Text style={styles.mutedCenter}>{data.length} điểm · interval={interval}</Text>
                </View>

                <Text style={styles.sectionLabel}>Bảng dữ liệu (tối đa 200 dòng gần nhất)</Text>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 1.4 }]}>Thời gian</Text>
                  <Text style={styles.th}>°C</Text>
                  <Text style={styles.th}>pH</Text>
                  <Text style={styles.th}>DO</Text>
                  <Text style={styles.th}>Đục</Text>
                </View>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={[styles.td, { flex: 1.4 }]}>{formatFull(item.ts)}</Text>
            <Text style={styles.td}>{fmt(item.temp, 'temp')}</Text>
            <Text style={styles.td}>{fmt(item.ph, 'ph')}</Text>
            <Text style={styles.td}>{fmt(item.do, 'do')}</Text>
            <Text style={styles.td}>{fmt(item.turbidity, 'turbidity')}</Text>
          </View>
        )}
        ListEmptyComponent={data !== null ? <Text style={styles.empty}>Không có dữ liệu trong khoảng đã chọn.</Text> : null}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fb' },
  sectionLabel: { fontWeight: '700', color: '#0b3d5c', marginTop: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#cde0ea',
  },
  chipActive: { backgroundColor: '#0b6e99', borderColor: '#0b6e99' },
  chipText: { color: '#0b3d5c', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  exportBtn: {
    backgroundColor: '#1b7f45', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 14, marginBottom: 8,
  },
  exportText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: '#c0392b', marginVertical: 8, textAlign: 'center' },
  loadingBox: { alignItems: 'center', paddingVertical: 40 },
  muted: { color: '#778', marginTop: 12, textAlign: 'center', paddingHorizontal: 16 },
  mutedCenter: { color: '#778', fontSize: 12, textAlign: 'center', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statLabel: { color: '#778', fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  panel: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  panelTitle: { fontWeight: '700', fontSize: 15, color: '#0b3d5c', marginBottom: 10 },
  empty: { color: '#778', paddingVertical: 24, textAlign: 'center' },
  tableHead: {
    flexDirection: 'row', backgroundColor: '#e8f1f6', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 6, marginTop: 4,
  },
  th: { flex: 1, fontWeight: '700', color: '#0b3d5c', fontSize: 12, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#e8eef2', backgroundColor: '#fff',
  },
  td: { flex: 1, fontSize: 12, color: '#223', textAlign: 'center' },
});
