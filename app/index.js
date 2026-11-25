import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ref, onValue } from 'firebase/database';
import { db } from '../src/firebase';
import { api } from '../src/api';
import { useAuth } from '../src/AuthContext';

// Một thẻ ao: đăng ký lắng nghe realtime pondsLatest/{id}
function PondCard({ pond, onPress }) {
  const [latest, setLatest] = useState(pond.latest || null);

  useEffect(() => {
    const unsub = onValue(ref(db, `pondsLatest/${pond.id}`), (snap) => setLatest(snap.val()));
    return unsub;
  }, [pond.id]);

  const online = !!latest?.online;
  const fmt = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d) : '--');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHead}>
        <Text style={styles.cardName}>{pond.name}</Text>
        <View style={[styles.badge, { backgroundColor: online ? '#d4f3df' : '#eee' }]}>
          <Text style={{ color: online ? '#1b7f45' : '#777', fontWeight: '600' }}>
            {online ? '● Online' : '○ Offline'}
          </Text>
        </View>
      </View>
      {!!pond.species && <Text style={styles.muted}>{pond.species}{pond.location ? ` · ${pond.location}` : ''}</Text>}
      <View style={styles.metrics}>
        <Metric label="Nhiệt độ" value={`${fmt(latest?.temp)}°C`} />
        <Metric label="pH" value={fmt(latest?.ph, 2)} />
        <Metric label="Oxy" value={fmt(latest?.do, 2)} />
        <Metric label="Độ đục" value={`${fmt(latest?.turbidity, 0)}%`} />
      </View>
    </TouchableOpacity>
  );
}

const Metric = ({ label, value }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [ponds, setPonds] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setPonds(await api('/ponds'));
    } catch (e) {
      setError(e.message);
      setPonds((old) => old || []);
    }
  }, []);

  // Tải lại mỗi khi quay về màn hình này (vd vừa thêm ao xong)
  useFocusEffect(useCallback(() => { if (user) load(); }, [user, load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmLogout = () =>
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <TouchableOpacity onPress={() => router.push('/add-pond')}>
                <Text style={styles.headerBtn}>＋ Thêm</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmLogout}>
                <Text style={styles.headerBtn}>Thoát</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {ponds === null ? (
        <ActivityIndicator size="large" color="#0b6e99" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ponds}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text style={styles.hello}>Xin chào, {user?.displayName || user?.email}</Text>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Text style={styles.muted}>Chưa có ao nào. Bấm "＋ Thêm" để tạo ao đầu tiên.</Text>
              <Text style={[styles.muted, { marginTop: 6 }]}>Mẹo: pondId phải trùng POND_ID trong firmware (vd pond1).</Text>
            </View>
          }
          renderItem={({ item }) => (
            <PondCard pond={item} onPress={() => router.push({ pathname: '/pond/[id]', params: { id: item.id, name: item.name } })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fb' },
  hello: { fontSize: 16, color: '#334', marginBottom: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 18, fontWeight: '700', color: '#0b3d5c' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  muted: { color: '#778', marginTop: 4, textAlign: 'center' },
  metrics: { flexDirection: 'row', marginTop: 14 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#0b6e99' },
  metricLabel: { fontSize: 12, color: '#778', marginTop: 2 },
  headerBtn: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: '#c0392b', marginBottom: 10, textAlign: 'center' },
});
