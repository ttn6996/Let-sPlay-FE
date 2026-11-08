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

- Cập nhật kế hoạch, xác nhận tham gia, hộp thông báo, sổ chi tiêu minh bạch và lịch sử chỉnh sửa.
- Gợi ý đề xuất theo ngân sách/sở thích, chọn điểm hẹn và điểm xuất phát chung trên bản đồ, phối hợp đi chung xe.
- Dự báo thời tiết theo tọa độ kèm phương án dự phòng; cấp quyền Calendar riêng để đồng bộ lịch một chiều.

## Quyền riêng tư và thông báo phòng

Tên các thành viên được công khai trong phòng; người tạo đề xuất không bị lộ. Phiếu và bình luận hiển thị “Bạn” với chính người viết, còn thành viên khác thấy “Ẩn danh”. Khi có hoạt động mới, phòng đang mở cập nhật realtime; Web Push phụ thuộc quyền thông báo của trình duyệt và VAPID config.

Sổ chi tiêu công khai cho thành viên trong phòng. Mỗi khoản cần phân bổ đủ tổng tiền cho nhiều người trả và người cùng chia; lịch sử giữ tên người sửa và thay đổi trước/sau. Google Calendar cần người dùng cấp scope `calendar.events` riêng; bản đồ chỉ tải khi mở trình chọn vị trí.

## Tìm giờ phù hợp

Chủ phòng thêm các mốc ngày giờ dự kiến; thành viên đánh dấu những mốc mình tham gia được. Kết quả chỉ hiển thị số người có thể tham gia và lựa chọn của chính người xem. Chủ phòng có thể chốt một mốc để cập nhật ngày giờ dự kiến của phòng.
