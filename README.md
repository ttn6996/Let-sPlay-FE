# Let-sPlay-FE

Frontend React, TypeScript, Vite và Tailwind cho Kèo.

## Chạy local

Từ thư mục `source/LetsPlay-FE`, copy `.env.example` thành `.env`, rồi chạy:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Vite nạp `VITE_API_URL` và `VITE_PORT` từ `.env`. Cổng mặc định là `5175`; app dừng nếu cổng đó đang được dùng.

## Luồng hiện có

- Tạo phòng với tên hiển thị và thông tin buổi hẹn tùy chọn.
- Tham gia phòng bằng mã mời.
- Xem mã mời, vai trò và giai đoạn của phòng.
- Token phiên khách và guest ID được giữ trong `sessionStorage` của tab hiện tại.

Các luồng góp ý, bình chọn, sắp lịch và chia tiền chưa được triển khai.
