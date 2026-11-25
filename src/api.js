import { auth } from './firebase';
import { API_URL } from './config';

// Gọi REST API của aqua-api, tự gắn Firebase ID token.
export async function api(path, { method = 'GET', body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Bạn chưa đăng nhập');
  const token = await user.getIdToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000); // Render free có thể "ngủ", cho chờ 20s
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(
      e.name === 'AbortError'
        ? 'API phản hồi quá lâu. Kiểm tra server đang chạy chưa.'
        : 'Không kết nối được API. Kiểm tra API_URL và WiFi.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  if (!res.ok) throw new Error((data && data.error) || `Lỗi ${res.status}`);
  return data;
}
