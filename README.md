# C-ng-ty-TNHH-u-t-TMDV-Q-T

## listbyme — thư viện truyện đọc nội bộ

Ứng dụng web tĩnh (không cần build, không cần backend), có màn hình **thư
viện** để chọn giữa nhiều truyện đã tải lên, nằm trong thư mục
[`docs/`](docs/) (đặt tên `docs` để GitHub Pages nhận diện sẵn, xem hướng
dẫn bật bên dưới).

### Dùng trên điện thoại qua GitHub Pages (khuyên dùng)

1. Vào repo trên GitHub → **Settings** → **Pages**.
2. Ở **Build and deployment** → **Source**, chọn **Deploy from a branch**.
3. Chọn nhánh đang chứa app này, thư mục **`/docs`**, bấm **Save**.
4. Sau khoảng 1–2 phút, trang sẽ có ở
   `https://<tên-tài-khoản>.github.io/<tên-repo>/` — mở link đó trên điện
   thoại, dùng menu trình duyệt để "Thêm vào Màn hình chính" là dùng như app
   thật.

### Chạy thử trên máy tính

```bash
cd docs
python3 -m http.server 8080
# rồi mở http://localhost:8080
```

Hoặc dùng bất kỳ static server nào khác (`npx serve docs`, Nginx, v.v.) — chỉ
cần trỏ root vào thư mục `docs/`. Mở trực tiếp `docs/index.html` bằng
`file://` cũng chạy được (không cần server) vì dữ liệu truyện được nạp qua
thẻ `<script>` chứ không phải `fetch`.

### Tính năng

- **Thư viện nhiều truyện**: màn hình chính liệt kê tất cả truyện đã thêm,
  có thẻ "Tiếp tục đọc" truyện gần nhất và % tiến độ từng truyện.
- **Mục lục** từng truyện, có ô tìm kiếm theo tên chương.
- **Phóng to/thu nhỏ cỡ chữ**, chỉnh giãn dòng và độ rộng nội dung.
- **3 chế độ đọc**: Sáng / Vàng (sepia) / Tối.
- **Tự động lưu & khôi phục vị trí đọc lần cuối của từng truyện riêng biệt**
  (chương + vị trí cuộn), lưu trong `localStorage` của trình duyệt trên máy
  đang dùng.
- Điều hướng chương trước/sau, phím tắt `←`/`→`.

### Thêm một truyện mới

```bash
pip install python-docx
python3 scripts/extract_docx.py path/to/truyen-moi.docx --id ten-truyen --title "Tên hiển thị"
```

- `--id`: định danh ngắn, không dấu (bỏ trống thì tự tạo từ tên truyện).
- `--title`: tên hiển thị trong thư viện (bỏ trống thì lấy dòng đầu tiên
  trong file Word).

Script tự động:
1. Tách chương dựa trên các đoạn có style `Heading 1` (tên chương) trong
   Word.
2. Ghi dữ liệu truyện vào `docs/data/story-<id>.js`.
3. Tự thêm dòng `<script>` tương ứng vào `docs/index.html` — truyện mới sẽ
   xuất hiện ngay trong thư viện, không cần sửa gì thêm.

Chạy lại nhiều lần với cùng `--id` sẽ ghi đè đúng file truyện đó (dùng để
cập nhật nội dung một truyện đã có).
