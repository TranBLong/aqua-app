# AquaFarm – App Expo (JavaScript + Expo Router)

## 1. Tạo project và chép code

```bash
npx create-expo-app@latest aqua-app --template blank
cd aqua-app
```

Chép **đè** các thư mục `app/` và `src/` trong gói này vào `aqua-app/`, rồi:

1. Xóa `App.js` và `index.js` (nếu có) ở thư mục gốc.
2. Mở `package.json`, đổi `"main"` thành `"expo-router/entry"`.
3. Mở `app.json`, thêm `"scheme": "aquafarm"` vào trong `"expo": { ... }`.

## 2. Cài thư viện

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar @react-native-async-storage/async-storage react-native-svg expo-linear-gradient
npm install firebase react-native-gifted-charts
```

(`npx expo install` tự chọn bản đúng với SDK đang dùng.)

## 3. Sửa `src/config.js`

- `API_URL`: IP LAN của máy chạy aqua-api, vd `http://192.168.1.10:3000` (lấy bằng `ipconfig`).
- `firebaseConfig`: copy từ Firebase Console → app web `aqua-web`. Phải có `databaseURL`.

## 4. Chạy

Terminal 1: `cd aqua-api && npm run dev`
Terminal 2: `cd aqua-app && npx expo start -c`
Quét QR bằng Expo Go. Điện thoại và máy tính cùng WiFi.

Nếu điện thoại không kết nối được API: kiểm tra Windows Firewall có cho Node.js nhận kết nối vào cổng 3000, và thử mở `http://<IP>:3000/health` bằng trình duyệt điện thoại.

## 5. Thử luồng đầy đủ

1. Đăng ký tài khoản trong app.
2. Bấm "＋ Thêm" → tạo ao với `pondId = pond1` (trùng `POND_ID` trong firmware).
3. Chạy Wokwi → số liệu ở Home cập nhật mỗi 5 giây.
4. Vào chi tiết ao → bật/tắt bơm, sục khí, bấm "Cho ăn ngay".
