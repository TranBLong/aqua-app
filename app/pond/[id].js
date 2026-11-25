import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { LineChart } from 'react-native-gifted-charts';
import { db } from '../../src/firebase';
import { api } from '../../src/api';

const METRICS = [
  { key: 'temp', label: 'Nhiệt độ', unit: '°C', color: '#e67e22' },
  { key: 'ph', label: 'pH', unit: '', color: '#8e44ad' },
  { key: 'do', label: 'Oxy', unit: 'mg/L', color: '#0b6e99' },
  { key: 'turbidity', label: 'Độ đục', unit: '%', color: '#7f8c8d' },
];

const DEVICES = [
  { key: 'pump', label: 'Máy bơm', icon: '💧' },
  { key: 'aerator', label: 'Sục khí', icon: '🫧' },
];

export default function PondDetail() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState(null);
  const [metric, setMetric] = useState('temp');
  const [busyKey, setBusyKey] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pondName, setPondName] = useState(name || 'Chi tiết ao');

  const loadPond = useCallback(async () => {
    try {
      const data = await api(`/ponds/${id}`);
      if (data?.name) setPondName(data.name);
    } catch (_) {
      // Giữ tên hiện tại nếu không tải lại được dữ liệu ao.
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadPond(); }, [loadPond]));

  // Realtime số liệu + trạng thái thiết bị
  useEffect(() => {
    const unsub = onValue(ref(db, `pondsLatest/${id}`), (snap) => setLatest(snap.val()));
    return unsub;
  }, [id]);

  useEffect(() => {
    const q = query(ref(db, `alerts/${id}`), orderByChild('ts'), limitToLast(50));
    const unsub = onValue(q, (snap) => {
      let n = 0;
      snap.forEach((child) => {
        if (child.val() && child.val().read === false) n += 1;
      });
      setUnreadCount(n);
    });
    return unsub;
  }, [id]);

  // Lịch sử cho biểu đồ (100 điểm gần nhất trong 24h)
  const loadHistory = useCallback(async () => {
    try {
      const res = await api(`/ponds/${id}/history?interval=raw&limit=100`);
      setHistory(res.data);
    } catch (e) {
      setHistory([]);
    }
  }, [id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const online = !!latest?.online;
  const isAuto = (latest?.mode || 'auto') === 'auto';

  const send = async (key, body) => {
    if (!online) return Alert.alert('Thiết bị offline', 'Chạy Wokwi và đợi thiết bị online rồi thử lại.');
    setBusyKey(key);
    try {
      await api(`/ponds/${id}/control`, { method: 'POST', body });
      // Không cần cập nhật state: ESP32 publish lại ngay, Firebase realtime sẽ đẩy về
    } catch (e) {
      Alert.alert('Không gửi được lệnh', e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const m = METRICS.find((x) => x.key === metric);
  const chartData = (history || [])
    .filter((r) => typeof r[metric] === 'number')
    .map((r) => ({ value: r[metric] }));
  const cur = latest?.[metric];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: pondName }} />

      {/* Trạng thái */}
      <View style={styles.rowBetween}>
        <Text style={[styles.badge, { color: online ? '#1b7f45' : '#777' }]}>
          {online ? '● Thiết bị online' : '○ Thiết bị offline'}
        </Text>
        {latest?.deviceAlert && <Text style={styles.warn}>⚠ Có cảnh báo</Text>}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/alerts/[id]', params: { id, name } })}
        >
          <Text style={styles.actionText}>
            🔔 Cảnh báo{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/thresholds/[id]', params: { id, name } })}
        >
          <Text style={styles.actionText}>⚙️ Ngưỡng</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.actionRow, { marginTop: 8 }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/schedules/[id]', params: { id, name } })}
        >
          <Text style={styles.actionText}>📅 Lịch cho ăn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/edit-pond/[id]', params: { id } })}
        >
          <Text style={styles.actionText}>✏️ Sửa ao</Text>
        </TouchableOpacity>
      </View>

      {/* Số liệu realtime */}
      <View style={styles.grid}>
        {METRICS.map((x) => (
          <TouchableOpacity
            key={x.key}
            style={[styles.tile, metric === x.key && { borderColor: x.color, borderWidth: 2 }]}
            onPress={() => setMetric(x.key)}
          >
            <Text style={[styles.tileValue, { color: x.color }]}>
              {typeof latest?.[x.key] === 'number' ? latest[x.key].toFixed(x.key === 'ph' || x.key === 'do' ? 2 : 1) : '--'}
              <Text style={styles.tileUnit}> {x.unit}</Text>
            </Text>
            <Text style={styles.tileLabel}>{x.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Biểu đồ */}
      <View style={styles.panel}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>Biểu đồ {m.label} (100 điểm gần nhất)</Text>
          <TouchableOpacity onPress={loadHistory}><Text style={styles.link}>Làm mới</Text></TouchableOpacity>
        </View>
        {history === null ? (
          <ActivityIndicator style={{ margin: 30 }} color={m.color} />
        ) : chartData.length < 2 ? (
          <Text style={styles.empty}>Chưa đủ dữ liệu. Hệ thống lưu 1 điểm/phút, hãy để Wokwi chạy thêm.</Text>
        ) : (
          <LineChart
            data={chartData}
            width={width - 100}
            height={180}
            color={m.color}
            thickness={2}
            hideDataPoints
            curved
            areaChart
            startFillColor={m.color}
            endFillColor={m.color}
            startOpacity={0.25}
            endOpacity={0.02}
            noOfSections={4}
            yAxisTextStyle={{ color: '#778', fontSize: 11 }}
            yAxisLabelWidth={36}
            rulesColor="#e3edf2"
            initialSpacing={0}
            spacing={Math.max(2, (width - 110) / Math.max(chartData.length, 1))}
            adjustToWidth
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.historyLink}
        onPress={() =>
          router.push({
            pathname: '/history/[id]',
            params: { id, name: pondName || name },
          })
        }
      >
        <Text style={styles.historyLinkText}>📈 Xem lịch sử chi tiết</Text>
      </TouchableOpacity>

      {/* Điều khiển */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Điều khiển thiết bị</Text>

        <View style={styles.ctrlRow}>
          <Text style={styles.ctrlLabel}>🤖 Chế độ tự động</Text>
          <Switch
            value={isAuto}
            disabled={!online || busyKey === 'mode'}
            onValueChange={(v) => send('mode', { mode: v ? 'auto' : 'manual' })}
          />
        </View>
        <Text style={styles.hint}>
          Tự động: bật sục khí khi oxy thấp, bật bơm khi nước đục. Bật/tắt tay bên dưới sẽ chuyển sang chế độ thủ công.
        </Text>

        {DEVICES.map((d) => (
          <View key={d.key} style={styles.ctrlRow}>
            <Text style={styles.ctrlLabel}>{d.icon} {d.label}</Text>
            <Switch
              value={!!latest?.[d.key]}
              disabled={!online || busyKey === d.key}
              onValueChange={(v) => send(d.key, { device: d.key, state: v })}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.feedBtn, (!online || busyKey === 'feeder') && { opacity: 0.5 }]}
          disabled={!online || busyKey === 'feeder'}
          onPress={() => send('feeder', { device: 'feeder', state: true })}
        >
          <Text style={styles.feedText}>
            {latest?.feeder ? '🍤 Đang cho ăn...' : '🍤 Cho ăn ngay'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fb' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontWeight: '700', fontSize: 15 },
  warn: { color: '#c0392b', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cde0ea',
  },
  actionText: { color: '#0b3d5c', fontWeight: '700', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tile: {
    width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  tileValue: { fontSize: 24, fontWeight: '800' },
  tileUnit: { fontSize: 13, fontWeight: '500', color: '#778' },
  tileLabel: { color: '#778', marginTop: 4 },
  panel: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 16 },
  panelTitle: { fontWeight: '700', fontSize: 16, color: '#0b3d5c', marginBottom: 10 },
  link: { color: '#0b6e99', fontWeight: '600' },
  historyLink: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cde0ea',
  },
  historyLinkText: { color: '#0b6e99', fontWeight: '700', fontSize: 15 },
  empty: { color: '#778', paddingVertical: 24, textAlign: 'center' },
  ctrlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  ctrlLabel: { fontSize: 16, color: '#223' },
  hint: { color: '#889', fontSize: 12, marginBottom: 6 },
  feedBtn: { backgroundColor: '#e67e22', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  feedText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
