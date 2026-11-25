import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true cho tới khi Firebase đọc xong phiên cũ

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);

  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
  };

  const logout = () => signOut(auth);

  const changePassword = async (currentPassword, newPassword) => {
    const u = auth.currentUser;
    if (!u || !u.email) throw new Error('Chưa đăng nhập');
    const credential = EmailAuthProvider.credential(u.email, currentPassword);
    await reauthenticateWithCredential(u, credential);
    await updatePassword(u, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Đổi mã lỗi Firebase sang tiếng Việt
export function authErrorMessage(e) {
  switch (e.code) {
    case 'auth/invalid-email': return 'Email không hợp lệ';
    case 'auth/missing-password': return 'Bạn chưa nhập mật khẩu';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Email hoặc mật khẩu không đúng';
    case 'auth/email-already-in-use': return 'Email này đã được đăng ký';
    case 'auth/weak-password': return 'Mật khẩu mới quá yếu (tối thiểu 6 ký tự)';
    case 'auth/requires-recent-login': return 'Phiên đăng nhập đã cũ, hãy đăng xuất rồi đăng nhập lại rồi thử đổi mật khẩu';
    case 'auth/network-request-failed': return 'Lỗi mạng, kiểm tra kết nối';
    case 'auth/too-many-requests': return 'Thử quá nhiều lần, hãy đợi một lúc';
    default: return e.message || 'Có lỗi xảy ra';
  }
}
