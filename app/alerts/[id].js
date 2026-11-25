import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';

const TYPE_ICON = {
  ph_low: '🧪',
  ph_high: '🧪',
  do_low: '🫧',
  temp_high: '🌡️',
  turbidity_high: '🌫️',
  device_offline: '📡',
};

function formatTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

export default function AlertsScreen() {
  const { id, name } = useLocalSearchParams();
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api(`/ponds/${id}/alerts?limit=100`);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setAlerts((old) => old || []);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markRead = async (alertId) => {
    setAlerts((prev) =>
      (prev || []).map((a) => (a.id === alertId ? { ...a, read: true } : a))
    );
    try {
      await api(`/ponds/${id}/alerts/${alertId}/read`, { method: 'PATCH' });
    } catch (e) {
      setAlerts((prev) =>
        (prev || []).map((a) => (a.id === alertId ? { ...a, read: false } : a))
      );
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setAlerts((prev) => (prev || []).map((a) => ({ ...a, read: true })));
    try {
      await api(`/ponds/${id}/alerts/read-all`, { method: 'POST' });
    } catch (e) {
      await load();
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = filter === 'unread'
    ? (alerts || []).filter((a) => !a.read)
    : (alerts || []);
  const unreadCount = (alerts || []).filter((a) => !a.read).length;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: name ? `Cảnh báo · ${name}` : 'Cảnh báo',
          headerRight: () => (
            <TouchableOpacity
              onPress={markAllRead}
              disabled={markingAll || unreadCount === 0}
              style={{ opacity: unreadCount === 0 ? 0.45 : 1 }}
            >
              <Text style={styles.headerBtn}>{markingAll ? '...' : 'Đọc hết'}</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'unread' && styles.filterActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Chưa đọc{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {alerts === null ? (
        <ActivityIndicator size="large" color="#0b6e99" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Text style={styles.muted}>
                {filter === 'unread' ? 'Không còn cảnh báo chưa đọc.' : 'Chưa có cảnh báo nào.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.read;
            const icon = TYPE_ICON[item.type] || '⚠️';
            const valueStr =
              item.value != null && item.threshold != null
                ? `${item.value} / ${item.threshold}`
                : item.value != null
                  ? String(item.value)
                  : '';

            return (
              <TouchableOpacity
                style={[styles.row, unread && styles.rowUnread]}
                onPress={() => unread && markRead(item.id)}
                activeOpacity={unread ? 0.7 : 1}
              >
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>{icon}</Text>
                  {unread && <View style={styles.dot} />}
                </View>
                <View style={styles.body}>
                  <Text style={[styles.message, unread && { fontWeight: '700' }]}>
                    {item.message || item.type}
                  </Text>
                  {!!valueStr && (
                    <Text style={styles.meta}>Giá trị / ngưỡng: {valueStr}</Text>
                  )}
                  <Text style={styles.time}>{formatTime(item.ts)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fb' },
  headerBtn: { color: '#fff', fontWeight: '700', fontSize: 15 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e8f1f6',
  },
  filterActive: { backgroundColor: '#0b6e99' },
  filterText: { color: '#0b3d5c', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  rowUnread: { backgroundColor: '#eef7fb' },
  iconWrap: { width: 40, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  icon: { fontSize: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c0392b', marginTop: 4 },
  body: { flex: 1 },
  message: { fontSize: 15, color: '#0b3d5c' },
  meta: { fontSize: 13, color: '#778', marginTop: 3 },
  time: { fontSize: 12, color: '#99a', marginTop: 4 },
  muted: { color: '#778', textAlign: 'center' },
  error: { color: '#c0392b', marginBottom: 10, textAlign: 'center' },
});
