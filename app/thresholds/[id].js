import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';

const DEFAULTS = {
  phMin: 6.5,
  phMax: 8.5,
  doMin: 4,
  tempMax: 35,
  turbidityMax: 70,
};

const FIELDS = [
  { key: 'phMin', label: 'pH tối thiểu', hint: '0 – 14' },
  { key: 'phMax', label: 'pH tối đa', hint: '0 – 14' },
  { key: 'doMin', label: 'Oxy tối thiểu (mg/L)', hint: '0 – 20' },
  { key: 'tempMax', label: 'Nhiệt độ tối đa (°C)', hint: '0 – 60' },
  { key: 'turbidityMax', label: 'Độ đục tối đa (%)', hint: '0 – 100' },
];

export default function ThresholdsScreen() {
  const { id, name } = useLocalSearchParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api(`/ponds/${id}/thresholds`);
      setForm({
        phMin: String(data.phMin ?? DEFAULTS.phMin),
        phMax: String(data.phMax ?? DEFAULTS.phMax),
        doMin: String(data.doMin ?? DEFAULTS.doMin),
        tempMax: String(data.tempMax ?? DEFAULTS.tempMax),
        turbidityMax: String(data.turbidityMax ?? DEFAULTS.turbidityMax),
      });
    } catch (e) {
      setError(e.message);
      setForm({
        phMin: String(DEFAULTS.phMin),
        phMax: String(DEFAULTS.phMax),
        doMin: String(DEFAULTS.doMin),
        tempMax: String(DEFAULTS.tempMax),
        turbidityMax: String(DEFAULTS.turbidityMax),
      });
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setVal = (key, text) => {
    setForm((f) => ({ ...f, [key]: text }));
    setFieldError('');
  };

  const validate = () => {
    const phMin = parseFloat(form.phMin);
    const phMax = parseFloat(form.phMax);
    const doMin = parseFloat(form.doMin);
    const tempMax = parseFloat(form.tempMax);
    const turbidityMax = parseFloat(form.turbidityMax);

    if ([phMin, phMax, doMin, tempMax, turbidityMax].some((v) => Number.isNaN(v))) {
      return 'Vui lòng nhập đủ số hợp lệ cho 5 ngưỡng.';
    }
    if (phMin < 0 || phMin > 14 || phMax < 0 || phMax > 14) {
      return 'pH phải nằm trong khoảng 0 – 14.';
    }
    if (!(phMin < phMax)) {
      return 'pH tối thiểu phải nhỏ hơn pH tối đa.';
    }
    if (doMin < 0 || doMin > 20) {
      return 'Oxy tối thiểu phải trong khoảng 0 – 20.';
    }
    if (tempMax < 0 || tempMax > 60) {
      return 'Nhiệt độ tối đa phải trong khoảng 0 – 60.';
    }
    if (turbidityMax < 0 || turbidityMax > 100) {
      return 'Độ đục tối đa phải trong khoảng 0 – 100.';
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setSaving(true);
    setFieldError('');
    try {
      await api(`/ponds/${id}/thresholds`, {
        method: 'PUT',
        body: {
          phMin: parseFloat(form.phMin),
          phMax: parseFloat(form.phMax),
          doMin: parseFloat(form.doMin),
          tempMax: parseFloat(form.tempMax),
          turbidityMax: parseFloat(form.turbidityMax),
        },
      });
      Alert.alert('Đã lưu', 'Ngưỡng cảnh báo đã được cập nhật.');
    } catch (e) {
      setFieldError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = () => {
    setForm({
      phMin: String(DEFAULTS.phMin),
      phMax: String(DEFAULTS.phMax),
      doMin: String(DEFAULTS.doMin),
      tempMax: String(DEFAULTS.tempMax),
      turbidityMax: String(DEFAULTS.turbidityMax),
    });
    setFieldError('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: name ? `Ngưỡng · ${name}` : 'Ngưỡng cảnh báo' }} />

      {form === null ? (
        <ActivityIndicator size="large" color="#0b6e99" style={{ marginTop: 40 }} />
      ) : (
        <>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.card}>
            {FIELDS.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={(t) => setVal(f.key, t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder={f.hint}
                  placeholderTextColor="#99a"
                />
              </View>
            ))}

            {!!fieldError && <Text style={styles.error}>{fieldError}</Text>}

            <TouchableOpacity
              style={[styles.btn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              <Text style={styles.btnText}>{saving ? 'Đang lưu...' : 'Lưu ngưỡng'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={restoreDefaults}>
              <Text style={styles.linkText}>Khôi phục mặc định</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            Ngưỡng này chỉ ảnh hưởng cảnh báo trên server. Ngưỡng tự động bật/tắt thiết bị nằm trong firmware.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fb' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  field: { marginBottom: 14 },
  label: { fontWeight: '600', color: '#0b3d5c', marginBottom: 6 },
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
  btn: {
    backgroundColor: '#0b6e99',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkBtn: { alignItems: 'center', paddingVertical: 14 },
  linkText: { color: '#0b6e99', fontWeight: '600' },
  note: {
    color: '#778',
    fontSize: 13,
    marginTop: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  error: { color: '#c0392b', marginBottom: 10, textAlign: 'center' },
});
