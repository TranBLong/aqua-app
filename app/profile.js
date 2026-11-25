import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { api } from '../src/api';
import { useAuth, authErrorMessage } from '../src/AuthContext';
import { auth } from '../src/firebase';

export default function ProfileScreen() {
  const { user, logout, changePassword } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const me = await api('/users/me');
      setDisplayName(me.displayName || user?.displayName || '');
      setPhone(me.phone || '');
    } catch (e) {
      setError(e.message);
      setDisplayName(user?.displayName || '');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveProfile = async () => {
    setError('');
    setOkMsg('');
    if (displayName.trim().length > 60) return setError('Tên hiển thị tối đa 60 ký tự');
    if (phone.trim().length > 20) return setError('Số điện thoại tối đa 20 ký tự');

    setSaving(true);
    try {
      await api('/users/me', {
        method: 'PUT',
        body: { displayName: displayName.trim(), phone: phone.trim() },
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      setOkMsg('Đã lưu hồ sơ');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPwError('');
    setPwOk('');
    if (!currentPw) return setPwError('Nhập mật khẩu hiện tại');
    if (newPw.length < 6) return setPwError('Mật khẩu mới tối thiểu 6 ký tự');
    if (newPw !== confirmPw) return setPwError('Mật khẩu nhập lại không khớp');

    setPwBusy(true);
    try {
      await changePassword(currentPw, newPw);
      setPwOk('Đổi mật khẩu thành công');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e) {
      setPwError(authErrorMessage(e));
    } finally {
      setPwBusy(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
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
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hồ sơ</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, styles.readonly]} value={user?.email || ''} editable={false} />

        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tên của bạn"
          maxLength={60}
        />

        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="090..."
          keyboardType="phone-pad"
          maxLength={20}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!okMsg && <Text style={styles.ok}>{okMsg}</Text>}

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lưu hồ sơ</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>

        <Text style={styles.label}>Mật khẩu hiện tại</Text>
        <TextInput style={styles.input} value={currentPw} onChangeText={setCurrentPw} secureTextEntry placeholder="••••••" />

        <Text style={styles.label}>Mật khẩu mới</Text>
        <TextInput style={styles.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="Tối thiểu 6 ký tự" />

        <Text style={styles.label}>Nhập lại mật khẩu mới</Text>
        <TextInput style={styles.input} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry placeholder="••••••" />

        {!!pwError && <Text style={styles.error}>{pwError}</Text>}
        {!!pwOk && <Text style={styles.ok}>{pwOk}</Text>}

        <TouchableOpacity style={[styles.btn, pwBusy && { opacity: 0.6 }]} onPress={onChangePassword} disabled={pwBusy}>
          {pwBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Đổi mật khẩu</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnDanger} onPress={confirmLogout}>
        <Text style={styles.btnText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f2f8fb', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f8fb' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0b3d5c', marginBottom: 12 },
  label: { fontWeight: '600', color: '#334', marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1,
    borderColor: '#d5e3ea', fontSize: 16, marginBottom: 8,
  },
  readonly: { backgroundColor: '#eef3f6', color: '#556' },
  error: { color: '#c0392b', marginVertical: 8 },
  ok: { color: '#1b7f45', marginVertical: 8, fontWeight: '600' },
  btn: { backgroundColor: '#0b6e99', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  btnDanger: { backgroundColor: '#c0392b', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
