# Hệ thống sức mạnh v2 — bản web

## Thay đổi
- Bỏ công thức BP = level × 100, rank và sao làm căn cứ so sánh.
- Bộ tính duy nhất: src/power.ts. So sánh chạy offline, không dùng API/key/quota.
- PI = 100 + 10 × log10(sức mạnh tương đối). Mốc Goku SSJ Namek = 100 PI.
- Đây là thang ước tính cân bằng của game, KHÔNG phải BP/chỉ số chính thức từ tác giả.
- Lực thuần tính bằng log để không mất độ chính xác do số nguyên khổng lồ.
- Hiệu số đối kháng = hiệu log lực thuần + 0.002 × chênh kỹ thuật + 0.002 × chênh tốc độ + 0.001 × chênh sức bền.
- Xác suất là mô hình game, không phải xác suất nguyên tác. Trạng thái ngang nhau không ép chọn thắng.

## Giai đoạn
Goku/Vegeta có Namek, Cell, Buu, Beerus, Golden Frieza, Goku Black, Giải đấu Sức mạnh, Broly. Chỉ cung cấp dạng phù hợp trong các giai đoạn mới; ví dụ Goku ở Cell không có SSJ2, Vegeta không có SSJ3.
Các nhân vật khác dùng hồ sơ theo thời kỳ sẵn có. GT được ghi rõ là dòng truyện riêng. Heroes/Xeno chưa hiệu chỉnh, không giả vờ có chỉ số.

Ví dụ Goku Super Saiyan: Namek 100.0 PI; Cell 107.0 PI; Buu 111.0 PI; Giải đấu Sức mạnh 133.0 PI. Các giá trị là lựa chọn thiết kế có thể chỉnh trong bảng ARCS, không phải số liệu Dragon Ball chính thức.

## Dung hợp và save
- Hồ sơ mới lưu trong powerProfile (version 2).
- Hồ sơ dung hợp lấy tổng lực thuần của các nguồn, cộng 0.3 log nếu có nhiều nguồn và các hiệu ứng vật phẩm được khai báo trong code.
- Không tự gán chỉ số cho vật phẩm/nhân vật chưa có hồ sơ. Hiện 'Chưa định lượng'.
- Quyền xóa sổ của Zeno và các thần sáng tạo không tự chuyển thành lực đấu tay đôi.
- Save cũ vẫn giữ tên, ảnh, dữ liệu và BP/level cũ để tương thích backup; các giá trị cũ không tham gia phép tính. Hồ sơ được dựng từ nguồn nhân vật. Nguồn thiếu/vòng lặp không được đoán.
- Save cũ có Goku/Vegeta DBZ chung mặc định cuối Buu; DBS chung mặc định Giải đấu Sức mạnh. Chọn giai đoạn cụ thể để tránh mơ hồ.
- Chưa có dữ liệu đủ để tái hiện chính xác mọi hiệu ứng dung hợp lịch sử; hồ sơ chưa xác định sẽ được thông báo rõ.

## Chạy
npm ci
npm test
npm run lint
npm run build
npm run dev

## Kiểm tra đã chạy
- Test logic: giai đoạn, dạng biến hình, đối xứng khi đảo vị trí, hòa, hồ sơ thiếu, chuyển save không đổi dữ liệu gốc, dung hợp, tham chiếu vòng lặp và nguồn đã xóa.
- TypeScript và build web: đạt. Vite vẫn cảnh báo bundle >500 KB.
- Chưa kiểm thử UI trên trình duyệt/điện thoại trong môi trường này; chưa gọi AI tạo ảnh/dung hợp thực tế.
- Không tạo hoặc cập nhật APK. Thư mục Android cũ được giữ nguyên; chỉ mã web được sửa.

## Ghi chú nguồn
Trang chính thức minh họa BP giai đoạn Namek (Frieza dạng 2 hơn một triệu): https://en.dragon-ball-official.com/news/01_1819.html
Nguồn này không xác lập các giá trị PI ở trên. Không gán các hệ số thiết kế cho nguyên tác.
