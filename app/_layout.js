import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthProvider, useAuth } from '../src/AuthContext';
import { colors } from '../src/theme';

function Splash() {
  return (
    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.splash}>
      <Text style={styles.logo}>🐟</Text>
      <Text style={styles.title}>AquaFarm</Text>
      <Text style={styles.sub}>Trang trại thủy sản thông minh</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
    </LinearGradient>
  );
}

// Chuyển hướng theo trạng thái đăng nhập: chưa đăng nhập -> /login, đã đăng nhập mà đang ở /login -> Home
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!user && !inLogin) router.replace('/login');
    else if (user && inLogin) router.replace('/');
  }, [user, loading, segments]);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Ao nuôi của tôi' }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="add-pond" options={{ title: 'Thêm ao mới', presentation: 'modal' }} />
        <Stack.Screen name="pond/[id]" options={{ title: 'Chi tiết ao' }} />
        <Stack.Screen name="alerts/[id]" options={{ title: 'Cảnh báo' }} />
        <Stack.Screen name="thresholds/[id]" options={{ title: 'Ngưỡng cảnh báo' }} />
        <Stack.Screen name="schedules/[id]" options={{ title: 'Lịch cho ăn' }} />
        <Stack.Screen name="edit-pond/[id]" options={{ title: 'Sửa ao' }} />
        <Stack.Screen name="profile" options={{ title: 'Hồ sơ' }} />
        <Stack.Screen name="history/[id]" options={{ title: 'Lịch sử' }} />
      </Stack>
      {/* Splash phủ lên trong lúc Firebase đang khôi phục phiên đăng nhập */}
      {loading && (
        <View style={StyleSheet.absoluteFill}>
          <Splash />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Gate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 64 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 8 },
  sub: { color: colors.splashSub, marginTop: 4 },
});
