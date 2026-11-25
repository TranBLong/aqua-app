// ====== CẤU HÌNH – SỬA 2 CHỖ NÀY TRƯỚC KHI CHẠY ======

// 1. Địa chỉ API.
//    - Chạy local: dùng IP LAN của máy tính (chạy `ipconfig` trên Windows, xem "IPv4 Address"),
//      KHÔNG dùng localhost vì điện thoại sẽ không hiểu.
//    - Sau khi deploy Render: đổi thành https://<ten-service>.onrender.com
export const API_URL = 'http://192.168.100.6:3000';

// 2. Firebase web config: Firebase Console -> Project settings -> Your apps -> app web `aqua-web` -> SDK setup and configuration
//    Lưu ý phải có `databaseURL` (đã tạo Realtime Database thì config mới có dòng này).
export const firebaseConfig = {
  apiKey: 'AIzaSyCO0MgIKATiLQy8MHlH1P4kmHKWZ38h4uI',
  authDomain: 'seasmart-2114a.firebaseapp.com',
  databaseURL: 'https://seasmart-2114a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'seasmart-2114a',
  storageBucket: 'seasmart-2114a.firebasestorage.app',
  messagingSenderId: '10393854129',
  appId: '1:10393854129:web:61d3f41d9e9ae8f8aac290',
};