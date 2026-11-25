import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth, authErrorMessage } from '../src/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../src/theme';
import { Card, PrimaryButton, ErrorBanner } from '../src/ui';

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
    <LinearGradient colors={[colors.primary, '#064a6b']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🐟</Text>
          <Text style={styles.title}>AquaFarm</Text>
          <Text style={styles.sub}>{isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}</Text>

          <Card style={styles.formCard}>
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

            <ErrorBanner message={error} />

            <PrimaryButton
              title={isRegister ? 'Đăng ký' : 'Đăng nhập'}
              busy={busy}
              onPress={submit}
            />

            <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setError(''); }}>
              <Text style={styles.link}>
                {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: '#fff' },
  sub: { textAlign: 'center', color: '#dcecf4', marginBottom: 24, marginTop: 4 },
  formCard: { marginTop: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#d5e3ea', fontSize: 16,
  },
  error: { color: '#c0392b', marginBottom: 12, textAlign: 'center' },
  btn: { backgroundColor: '#0b6e99', borderRadius: 10, padding: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#0b6e99', textAlign: 'center', marginTop: 18 },
});
