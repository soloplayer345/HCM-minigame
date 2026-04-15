# HCM Minigame

Phiên bản mini-game đa người chơi lấy cảm hứng từ phong cách "ma sói" / "Among Us" với bối cảnh kháng chiến. Người chơi vào vai dân làng, gián điệp, sát thủ, tình báo, bí thư chi bộ và dân quân để chiến đấu trong các vòng ngày/đêm.

## Công nghệ

- React
- Vite
- Firebase Realtime Database
- Sass
- Lucide React

## Chạy dự án

1. Cài đặt phụ thuộc:

```bash
npm install
```

2. Khởi chạy môi trường phát triển:

```bash
npm run dev
```

3. Mở trình duyệt và truy cập địa chỉ được hiển thị (mặc định là `http://localhost:5173`).

## Cấu trúc chính

- `src/main.jsx` - entrypoint của ứng dụng React
- `src/pages/Game.jsx` - logic trò chơi và thao tác người chơi
- `src/components/game/Room.jsx` - giao diện phòng chơi
- `src/components/game/PlayerList.jsx` - hiển thị danh sách người chơi
- `src/services/gameService.js` - xử lý trạng thái phòng, hành động đêm/ngày và Firebase
- `src/services/roles.js` - định nghĩa vai trò và hàm hỗ trợ
- `src/services/firebase.js` - cấu hình Firebase
- `src/styles/game.scss` - style trò chơi

## Gameplay

Trò chơi vận hành theo vòng `ngày` và `đêm`:

- `Ngày`: người chơi thảo luận và bỏ phiếu loại một người.
- `Đêm`: các vai trò đặc biệt thực hiện hành động của mình.

### Vai trò chính

- `trùm gián điệp`: một trong hai người thuộc phe gián điệp.
- `gián điệp`: phe phản diện, có thể nhiễu tình báo.
- `sát thủ`: ám sát 1 người mỗi đêm.
- `bí thư chi bộ`: bảo vệ 1 người vào ban ngày khỏi bị loại bằng phiếu.
- `tình báo`: khám phá vai trò 1 người mỗi đêm.
- `dân quân`: bảo vệ 1 người khỏi bị ám sát mỗi đêm.
- `dân`: người chơi bình thường.

### Thứ tự hành động ban đêm

1. `Dân quân` bảo vệ 1 người khỏi bị sát thủ ám sát.
2. `Sát thủ` chọn 1 người để ám sát.
3. `Gián điệp` có thể nhiễu tình báo bằng cách gán role giả cho 1 người.
4. `Tình báo` khám phá vai trò 1 người; nếu mục tiêu bị gián điệp nhiễu, kết quả sẽ hiển thị là `gián điệp`.

## Ghi chú

- Phòng chơi sử dụng Firebase Realtime Database để đồng bộ trạng thái giữa các người chơi.
- Host chỉ điều khiển giai đoạn trò chơi và không tham gia bỏ phiếu.
- Nếu cần điều chỉnh quy tắc vai trò, hãy sửa `src/services/gameService.js` và `src/components/game/Room.jsx`.

---

Nếu cần mở rộng thêm tính năng hoặc chỉnh sửa tiếp, tôi có thể giúp bổ sung hướng dẫn cài đặt và mô tả chi tiết hơn.