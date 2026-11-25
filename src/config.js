// ====== CẤU HÌNH – SỬA 2 CHỖ NÀY TRƯỚC KHI CHẠY ======

// 1. Địa chỉ API.
//    - Chạy local: dùng IP LAN của máy tính (chạy `ipconfig` trên Windows, xem "IPv4 Address"),
//      KHÔNG dùng localhost vì điện thoại sẽ không hiểu.
//    - Sau khi deploy Render: đổi thành https://<ten-service>.onrender.com
export const API_URL = 'http://192.168.100.6:3000';

// 2. Firebase web config: Firebase Console -> Project settings -> Your apps -> app web `aqua-web` -> SDK setup and configuration
//    Lưu ý phải có `databaseURL` (đã tạo Realtime Database thì config mới có dòng này).
export const firebaseConfig = {
  apiKey: 'DIEN_VAO',
  authDomain: 'DIEN_VAO.firebaseapp.com',
  databaseURL: 'https://DIEN_VAO-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'DIEN_VAO',
  storageBucket: 'DIEN_VAO.appspot.com',
  messagingSenderId: 'DIEN_VAO',
  appId: 'DIEN_VAO',
};
