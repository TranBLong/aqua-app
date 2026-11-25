import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth, authErrorMessage } from '../src/AuthContext';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim()) return setError('Bạn chưa nhập email');
    if (!password) return setError('Bạn chưa nhập mật khẩu');
    setBusy(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
      // Đăng nhập xong, Gate trong _layout tự chuyển về Home
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🐟</Text>
        <Text style={styles.title}>AquaFarm</Text>
        <Text style={styles.sub}>{isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}</Text>

        {isRegister && (
          <TextInput style={styles.input} placeholder="Tên hiển thị" value={name} onChangeText={setName} />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.btnText}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setError(''); }}>
          <Text style={styles.link}>
            {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f2f8fb' },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', color: '#0b6e99' },
  sub: { textAlign: 'center', color: '#667', marginBottom: 24, marginTop: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#d5e3ea', fontSize: 16,
  },
  error: { color: '#c0392b', marginBottom: 12, textAlign: 'center' },
  btn: { backgroundColor: '#0b6e99', borderRadius: 10, padding: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#0b6e99', textAlign: 'center', marginTop: 18 },
});
