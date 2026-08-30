# C-ng-ty-TNHH-u-t-TMDV-Q-T

## App đọc truyện nội bộ — "Trung Thần"

Ứng dụng web tĩnh (không cần build, không cần backend) để đọc truyện nội bộ,
nằm trong thư mục [`docs/`](docs/) (đặt tên `docs` để GitHub Pages nhận diện
sẵn, xem hướng dẫn bật bên dưới).

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

- **Mục lục** đầy đủ 131 chương, có ô tìm kiếm theo tên chương.
- **Phóng to/thu nhỏ cỡ chữ**, chỉnh giãn dòng và độ rộng nội dung.
- **3 chế độ đọc**: Sáng / Vàng (sepia) / Tối.
- **Tự động lưu & khôi phục vị trí đọc lần cuối** (chương + vị trí cuộn),
  lưu trong `localStorage` của trình duyệt trên máy đang dùng.
- Điều hướng chương trước/sau, phím tắt `←`/`→`.

### Cập nhật nội dung truyện

Dữ liệu truyện được sinh sẵn tại `docs/data/story-data.js` từ file `.docx`
gốc. Nếu cần cập nhật/nạp lại từ một bản `.docx` khác:

```bash
pip install python-docx
python3 scripts/extract_docx.py path/to/story.docx
```

Script tách chương dựa trên các đoạn có style `Heading 1` (tên chương) trong
Word.