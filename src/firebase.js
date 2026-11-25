import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth lưu phiên đăng nhập vào AsyncStorage để mở lại app không phải đăng nhập lại.
// initializeAuth chỉ được gọi 1 lần; khi Fast Refresh chạy lại file này thì dùng getAuth.
let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  auth = getAuth(app);
}

export { app, auth };
export const db = getDatabase(app);
