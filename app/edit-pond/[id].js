import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';

export default function EditPondScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [name, setName] = useState('');
  const [pondId, setPondId] = useState('');
  const [location, setLocation] = useState('');
  const [species, setSpecies] = useState('');
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api(`/ponds/${id}`);
      setName(data.name || '');
      setPondId(data.pondId || data.id || id);
      setLocation(data.location || '');
      setSpecies(data.species || '');
      setArea(data.area != null ? String(data.area) : '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Bạn chưa nhập tên ao');
    if (name.trim().length > 60) return setError('Tên ao tối đa 60 ký tự');
    if (location.trim().length > 120) return setError('Vị trí tối đa 120 ký tự');
    if (species.trim().length > 60) return setError('Loài nuôi tối đa 60 ký tự');

    const body = {
      name: name.trim(),
      location: location.trim(),
      species: species.trim(),
    };
    if (area.trim() !== '') {
      const n = Number(area);
      if (!Number.isFinite(n) || n < 0) return setError('Diện tích phải ≥ 0');
      body.area = n;
    }

    setBusy(true);
    try {
      await api(`/ponds/${id}`, { method: 'PUT', body });
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Xóa ao',
      'Bạn chắc chắn muốn xóa ao này?\nToàn bộ dữ liệu cảm biến, cảnh báo và lịch cho ăn sẽ bị xóa vĩnh viễn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api(`/ponds/${id}`, { method: 'DELETE' });
              router.replace('/');
            } catch (e) {
              setError(e.message);
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0b6e99" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Tên ao *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ao số 1" maxLength={60} />

      <Text style={styles.label}>pondId (không sửa được)</Text>
      <TextInput style={[styles.input, styles.readonly]} value={pondId} editable={false} />
      <Text style={styles.hint}>Phải trùng POND_ID trong firmware</Text>

      <Text style={styles.label}>Vị trí</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Đà Nẵng" maxLength={120} />

      <Text style={styles.label}>Loài nuôi</Text>
      <TextInput style={styles.input} value={species} onChangeText={setSpecies} placeholder="Tôm thẻ chân trắng" maxLength={60} />

      <Text style={styles.label}>Diện tích (m²)</Text>
      <TextInput style={styles.input} value={area} onChangeText={setArea} keyboardType="numeric" placeholder="500" />

      <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lưu thay đổi</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnDanger, busy && { opacity: 0.6 }]} onPress={confirmDelete} disabled={busy}>
        <Text style={styles.btnText}>Xóa ao</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f2f8fb', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f8fb' },
  label: { fontWeight: '600', color: '#334', marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1,
    borderColor: '#d5e3ea', fontSize: 16, marginBottom: 8,
  },
  readonly: { backgroundColor: '#eef3f6', color: '#556' },
  hint: { color: '#778', fontSize: 12, marginBottom: 8, marginTop: -4 },
  error: { color: '#c0392b', marginBottom: 12 },
  btn: { backgroundColor: '#0b6e99', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 16 },
  btnDanger: { backgroundColor: '#c0392b', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
