import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MAX_SCHEDULES = 20;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function formatFeedTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

function formatTimeInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function SchedulesScreen() {
  const { id, name } = useLocalSearchParams();
  const [schedules, setSchedules] = useState(null);
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [feeding, setFeeding] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formTime, setFormTime] = useState('');
  const [formDays, setFormDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [formLabel, setFormLabel] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const data = await api(`/ponds/${id}/schedules`);
      const list = Array.isArray(data) ? [...data] : [];
      list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setSchedules(list);
    } catch (e) {
      setError(e.message);
      setSchedules((old) => old || []);
    }
  }, [id]);

  const loadLogs = useCallback(async () => {
    try {
      const data = await api(`/ponds/${id}/feeding-logs?limit=30`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setLogs((old) => old || []);
    }
  }, [id]);

  const loadAll = useCallback(async () => {
    setError('');
    await Promise.all([loadSchedules(), loadLogs()]);
  }, [loadSchedules, loadLogs]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const openAdd = () => {
    if ((schedules || []).length >= MAX_SCHEDULES) {
      Alert.alert('Đã đủ lịch', `Mỗi ao tối đa ${MAX_SCHEDULES} lịch cho ăn.`);
      return;
    }
    setEditing(null);
    setFormTime('');
    setFormDays([0, 1, 2, 3, 4, 5, 6]);
    setFormLabel('');
    setFormEnabled(true);
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormTime(item.time || '');
    setFormDays(Array.isArray(item.days) && item.days.length ? [...item.days] : [0, 1, 2, 3, 4, 5, 6]);
    setFormLabel(item.label || '');
    setFormEnabled(item.enabled !== false);
    setFormError('');
    setModalVisible(true);
  };

  const toggleDay = (day) => {
    setFormDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const saveForm = async () => {
    if (!TIME_REGEX.test(formTime)) {
      setFormError('Giờ phải dạng HH:mm (00:00 – 23:59).');
      return;
    }
    if (formDays.length < 1) {
      setFormError('Chọn ít nhất một ngày.');
      return;
    }
    if (formLabel.length > 60) {
      setFormError('Nhãn tối đa 60 ký tự.');
      return;
    }

    setSaving(true);
    setFormError('');
    const body = {
      time: formTime,
      days: formDays,
      enabled: formEnabled,
      label: formLabel.trim() || undefined,
    };

    try {
      if (editing) {
        await api(`/ponds/${id}/schedules/${editing.id}`, { method: 'PUT', body });
      } else {
        await api(`/ponds/${id}/schedules`, { method: 'POST', body });
      }
      setModalVisible(false);
      await loadSchedules();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (item, value) => {
    setSchedules((prev) =>
      (prev || []).map((s) => (s.id === item.id ? { ...s, enabled: value } : s))
    );
    try {
      await api(`/ponds/${id}/schedules/${item.id}`, {
        method: 'PUT',
        body: { enabled: value },
      });
    } catch (e) {
      setSchedules((prev) =>
        (prev || []).map((s) => (s.id === item.id ? { ...s, enabled: !value } : s))
      );
      Alert.alert('Lỗi', e.message);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert(
      'Xóa lịch',
      `Xóa lịch ${item.time}${item.label ? ` (${item.label})` : ''}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/ponds/${id}/schedules/${item.id}`, { method: 'DELETE' });
              setSchedules((prev) => (prev || []).filter((s) => s.id !== item.id));
            } catch (e) {
              Alert.alert('Không xóa được', e.message);
            }
          },
        },
      ]
    );
  };

  const feedNow = async () => {
    setFeeding(true);
    try {
      await api(`/ponds/${id}/control`, {
        method: 'POST',
        body: { device: 'feeder', state: true },
      });
      setTimeout(() => loadLogs(), 1000);
    } catch (e) {
      const msg =
        e.message && (e.message.includes('409') || /offline/i.test(e.message))
          ? 'Thiết bị đang offline'
          : e.message;
      Alert.alert('Không cho ăn được', msg);
    } finally {
      setFeeding(false);
    }
  };

  const canAdd = (schedules || []).length < MAX_SCHEDULES;

  const renderSchedule = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.enabled && styles.cardDisabled]}
      onPress={() => openEdit(item)}
      onLongPress={() => confirmDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <Text style={styles.timeBig}>{item.time}</Text>
        <Switch
          value={!!item.enabled}
          onValueChange={(v) => toggleEnabled(item, v)}
        />
      </View>
      {!!item.label && <Text style={styles.label}>{item.label}</Text>}
      <View style={styles.daysRow}>
        {DAY_LABELS.map((lbl, day) => {
          const active = Array.isArray(item.days) && item.days.includes(day);
          return (
            <View key={day} style={[styles.dayChip, active && styles.dayChipOn]}>
              <Text style={[styles.dayChipText, active && styles.dayChipTextOn]}>{lbl}</Text>
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={styles.deleteLink} onPress={() => confirmDelete(item)}>
        <Text style={styles.deleteText}>Xóa</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: name ? `Lịch cho ăn · ${name}` : 'Lịch cho ăn',
          headerRight: () => (
            <TouchableOpacity
              onPress={openAdd}
              disabled={!canAdd}
              style={{ opacity: canAdd ? 1 : 0.4 }}
            >
              <Text style={styles.headerBtn}>＋ Thêm lịch</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {schedules === null ? (
        <ActivityIndicator size="large" color="#0b6e99" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View>
              {!!error && <Text style={styles.error}>{error}</Text>}
              {!canAdd && (
                <Text style={styles.limitHint}>
                  Đã đủ {MAX_SCHEDULES} lịch — xóa bớt để thêm mới.
                </Text>
              )}
              <Text style={styles.sectionTitle}>Lịch đã đặt</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.muted}>Chưa có lịch nào. Bấm "＋ Thêm lịch" để tạo.</Text>
          }
          renderItem={renderSchedule}
          ListFooterComponent={
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.feedBtn, feeding && { opacity: 0.6 }]}
                onPress={feedNow}
                disabled={feeding}
              >
                <Text style={styles.feedBtnText}>
                  {feeding ? 'Đang gửi...' : '🍤 Cho ăn ngay'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.note}>
                Lịch chạy trên server (giờ Việt Nam). Server phải đang hoạt động để lịch được thực thi.
              </Text>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Lịch sử cho ăn</Text>
              {logs === null ? (
                <ActivityIndicator color="#0b6e99" style={{ marginVertical: 16 }} />
              ) : logs.length === 0 ? (
                <Text style={styles.muted}>Chưa có lần cho ăn nào.</Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.logRow}>
                    <Text style={styles.logText}>
                      🍤 {formatFeedTime(log.ts)} —{' '}
                      {log.source === 'schedule' ? 'Theo lịch' : 'Thủ công'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editing ? 'Sửa lịch' : 'Thêm lịch cho ăn'}
            </Text>

            <Text style={styles.fieldLabel}>Giờ (HH:mm)</Text>
            <TextInput
              style={styles.input}
              value={formTime}
              onChangeText={(t) => setFormTime(formatTimeInput(t))}
              placeholder="08:30"
              placeholderTextColor="#99a"
              keyboardType="number-pad"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>Ngày trong tuần</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((lbl, day) => {
                const active = formDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, active && styles.dayChipOn]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextOn]}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Nhãn (tùy chọn)</Text>
            <TextInput
              style={styles.input}
              value={formLabel}
              onChangeText={setFormLabel}
              placeholder="VD: Cho ăn sáng"
              placeholderTextColor="#99a"
              maxLength={60}
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Bật lịch</Text>
              <Switch value={formEnabled} onValueChange={setFormEnabled} />
            </View>

            {!!formError && <Text style={styles.error}>{formError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveForm}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fb' },
  headerBtn: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3d5c',
    marginBottom: 10,
  },
  limitHint: {
    color: '#e67e22',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.55 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBig: { fontSize: 28, fontWeight: '800', color: '#0b6e99' },
  label: { color: '#556', marginTop: 4, fontSize: 14 },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#e8f1f6',
  },
  dayChipOn: { backgroundColor: '#0b6e99' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#0b3d5c' },
  dayChipTextOn: { color: '#fff' },
  deleteLink: { alignSelf: 'flex-end', marginTop: 8 },
  deleteText: { color: '#c0392b', fontWeight: '600', fontSize: 13 },
  feedBtn: {
    backgroundColor: '#e67e22',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  feedBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  note: {
    color: '#778',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  logRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  logText: { color: '#334', fontSize: 14 },
  muted: { color: '#778', textAlign: 'center', marginVertical: 12 },
  error: { color: '#c0392b', marginBottom: 8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b3d5c',
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#0b3d5c',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cde0ea',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#223',
    backgroundColor: '#fafcfe',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#e8f1f6',
  },
  cancelText: { color: '#0b3d5c', fontWeight: '700' },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#0b6e99',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
