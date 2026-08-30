# C-ng-ty-TNHH-u-t-TMDV-Q-T

## App đọc truyện nội bộ — "Trung Thần"

Ứng dụng web tĩnh (không cần build, không cần backend) để đọc truyện nội bộ,
nằm trong thư mục [`app/`](app/).

### Chạy thử

Cần chạy qua một server tĩnh (không mở trực tiếp file `index.html` bằng
`file://`, vì trình duyệt sẽ chặn việc tải `data/story-data.js`):

```bash
cd app
python3 -m http.server 8080
# rồi mở http://localhost:8080
```

Hoặc dùng bất kỳ static server nào khác (`npx serve app`, Nginx, v.v.) — chỉ
cần trỏ root vào thư mục `app/`.

### Tính năng

- **Mục lục** đầy đủ 131 chương, có ô tìm kiếm theo tên chương.
- **Phóng to/thu nhỏ cỡ chữ**, chỉnh giãn dòng và độ rộng nội dung.
- **3 chế độ đọc**: Sáng / Vàng (sepia) / Tối.
- **Tự động lưu & khôi phục vị trí đọc lần cuối** (chương + vị trí cuộn),
  lưu trong `localStorage` của trình duyệt trên máy đang dùng.
- Điều hướng chương trước/sau, phím tắt `←`/`→`.

### Cập nhật nội dung truyện

Dữ liệu truyện được sinh sẵn tại `app/data/story-data.js` từ file `.docx`
gốc. Nếu cần cập nhật/nạp lại từ một bản `.docx` khác:

```bash
pip install python-docx
python3 scripts/extract_docx.py path/to/story.docx
```

Script tách chương dựa trên các đoạn có style `Heading 1` (tên chương) trong
Word.