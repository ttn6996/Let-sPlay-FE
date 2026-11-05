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
- Kết nối SSE có Bearer token; tự reconnect và tải snapshot mới khi revision phòng thay đổi.
- Token phiên khách và guest ID được giữ trong `sessionStorage` của tab hiện tại.

Các luồng góp ý, bình chọn, sắp lịch và chia tiền chưa được triển khai.

## Quyền riêng tư và thông báo phòng

Trong response phòng, tên của thành viên khác được thay bằng nhãn ẩn danh; proposal chỉ trả `createdByMe`, còn phiếu của bạn hiện là “Bạn” và phiếu khác hiện “Ẩn danh”. Khi có đề xuất mới, phòng đang mở hiện toast kèm âm/rung best effort. Nút **Bật thông báo đẩy** đăng ký Web Push cho thiết bị hiện tại; cần cấp quyền trình duyệt và backend phải có VAPID keys.

## Tìm giờ phù hợp

Chủ phòng thêm các mốc ngày giờ dự kiến; thành viên đánh dấu những mốc mình tham gia được. Kết quả chỉ hiển thị số người có thể tham gia và lựa chọn của chính người xem. Chủ phòng có thể chốt một mốc để cập nhật ngày giờ dự kiến của phòng.
