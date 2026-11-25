import React, { useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import { PrimaryButton, ErrorBanner } from '../src/ui';

export default function AddPondScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pondId, setPondId] = useState('pond1');
  const [location, setLocation] = useState('');
  const [species, setSpecies] = useState('');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Bạn chưa nhập tên ao');
    if (!/^[a-z0-9_-]{3,30}$/.test(pondId)) return setError('pondId chỉ gồm a-z, 0-9, _, - (3-30 ký tự)');
    const body = { name: name.trim(), pondId, location: location.trim(), species: species.trim() };
    if (area.trim()) body.area = Number(area);
    setBusy(true);
    try {
      await api('/ponds', { method: 'POST', body });
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Tên ao *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ao số 1" />

      <Text style={styles.label}>pondId * (phải trùng POND_ID trong firmware)</Text>
      <TextInput
        style={styles.input} value={pondId} onChangeText={(t) => setPondId(t.toLowerCase())}
        autoCapitalize="none" placeholder="pond1"
      />

      <Text style={styles.label}>Vị trí</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Đà Nẵng" />

      <Text style={styles.label}>Loài nuôi</Text>
      <TextInput style={styles.input} value={species} onChangeText={setSpecies} placeholder="Tôm thẻ chân trắng" />

      <Text style={styles.label}>Diện tích (m²)</Text>
      <TextInput style={styles.input} value={area} onChangeText={setArea} keyboardType="numeric" placeholder="500" />

      <ErrorBanner message={error} />
      <PrimaryButton title="Tạo ao" busy={busy} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f2f8fb', flexGrow: 1 },
  label: { fontWeight: '600', color: '#334', marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1,
    borderColor: '#d5e3ea', fontSize: 16, marginBottom: 8,
  },
  error: { color: '#c0392b', marginVertical: 10 },
  btn: { backgroundColor: '#0b6e99', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
