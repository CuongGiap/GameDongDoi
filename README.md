# Dòng Đời

Nguyên mẫu **v0.1** của một web game mô phỏng đời người: nuôi một đứa trẻ đi qua lớp 1 đến lớp 3.

Chạy hoàn toàn trong trình duyệt, một file, không cần cài gì, không cần mạng.

```
mở dong-doi.html bằng trình duyệt
```

---

## Luận điểm thiết kế

Game đứng trên **hai trục tuổi tách rời nhau**:

| Trục | Chạy theo | Người chơi can thiệp được không |
|---|---|---|
| **Tuổi sinh học** | Thời gian thật (1 năm học = 7 ngày) | Không |
| **Tiến độ học** | Nỗ lực trong game | Có |

Hai trục lệch nhau được, và chính độ lệch đó là kịch tính:

- Học chăm → 11 tuổi đã lớp 6 → *Thần đồng*
- Bỏ bê → 13 tuổi còn lớp 4 → *lưu ban*, tụt lại sau bạn cùng lứa

Đây là thứ cần kiểm chứng trước tiên. Nếu vòng lặp này không hay thì không tính năng nào cứu được, nên v0.1 cắt sạch mọi thứ khác để thử riêng nó.

## Vòng lặp chơi

```
Tiêu năng lượng vào học → chỉ số nhích lên → thi → lên lớp hoặc lưu ban
```

Mỗi năm học có 7 ngày: 3 ngày học kỳ I, kiểm tra giữa kỳ, 2 ngày học kỳ II, thi cuối năm.

Lên lớp cần điểm trung bình từ 5,0 **và** không môn nào dưới 3,5. Trượt lần đầu được thi lại trong hè bằng một đề mới.

## Thi bằng câu hỏi thật

Kiểm tra giữa kỳ và thi cuối năm là **bài trắc nghiệm thật**, câu hỏi bám chương trình tiểu học Việt Nam theo đúng khối lớp:

| Lớp | Toán | Tiếng Việt |
|---|---|---|
| 1 | Cộng trừ phạm vi 20, so sánh, hình cơ bản | Âm vần, dấu thanh, từ loại đơn giản |
| 2 | Cộng trừ có nhớ trong 100, bảng nhân 2–5, đo lường | Kiểu câu, dấu câu, chính tả |
| 3 | Nhân chia trong bảng, số trong 1000, chu vi | So sánh, nhân hoá, từ láy, từ ghép |

96 câu, mỗi câu 4 đáp án, xáo thứ tự khi ra đề.

Điểm thi tính theo công thức:

```
điểm môn = (số câu đúng / tổng số câu) × 10 × 0,7  +  điểm tích luỹ × 0,3
```

Tức **kiến thức thật quyết định kết quả**, nhưng học trong game vẫn có giá trị:

- Nâng 30% nền điểm
- Cho lượt **trợ giúp 50:50** — số lượt = điểm môn ÷ 2,5, tối đa 3

Hệ quả có chủ đích: học chăm mà làm sai hết vẫn trượt, học ít mà làm đúng hết vẫn đạt. Việc học giúp người chơi dễ thở hơn trong phòng thi, không thay người chơi trả lời.

**Thể dục không thi trắc nghiệm** — là môn thực hành nên chấm theo chỉ số Thể chất, đúng như ngoài đời.

## Ngoại hình nhân vật

Chọn một trong 18 gương mặt khi tạo nhân vật, đổi lúc nào cũng được bằng cách bấm vào gương mặt ở thanh đầu trang.

Đây là mức tối giản có chủ ý. Ghép lớp tóc, da, quần áo để v0.2 — bỏ công vẽ nhân vật cho một nguyên mẫu có thể bị bỏ là đúng kiểu lãng phí mà lộ trình này đang tránh. Bản lưu cũ không có trường `avatar` vẫn chạy, rơi về mặc định theo giới tính.

## Chế độ tua nhanh

Không thể chơi thử một game 7-ngày-một-năm bằng thời gian thật. Mở **Bảng công cụ** ở cuối trang để bật tua nhanh — 1 năm học rút còn ~6 phút, năng lượng hồi 1 điểm mỗi 1,5 giây.

Đây là công cụ làm việc, không phải tính năng phụ. Thiếu nó thì mỗi lần chỉnh cân bằng số phải chờ cả tuần.

---

## Kiểm thử

```
node qa.js      # 70 ca — engine, cân bằng, ngân hàng câu hỏi
node qa-ui.js   # 56 ca — tầng giao diện
```

70 ca kiểm thử trên engine, kèm mô phỏng 900 lượt chơi tự động để kiểm tra độ khó.

Trong đó có phần tự kiểm chứng ngân hàng câu hỏi: mọi câu phải đủ 4 đáp án không trùng nhau, vị trí đáp án đúng phải rải đều, một đề không được lặp câu, và **30 câu phép tính được máy giải lại để đối chiếu đáp án**. Đáp án sai trong game dạy trẻ là lỗi thật, không nên để mắt người soát.

`qa.js` rút thẳng khối `Engine` ra từ `dong-doi.html` rồi nạp vào, nên không có bản sao engine nào để lệch nhau.

Mức cân bằng hiện tại:

| Kiểu chơi | Tỷ lệ từng lưu ban |
|---|---|
| Chăm | 0% |
| Trung bình | ~4% |
| Lười | ~80% |

Chạy lại bộ test sau mỗi lần chỉnh số cân bằng (`DIEM_DAU`, `QUEN_NGAY`, `TY_TRONG_BAI_LAM`, chi phí năng lượng) hoặc sau khi thêm câu hỏi. Nó sẽ báo ngay nếu độ khó bị hỏng hay câu hỏi mới viết sai định dạng.

## Cấu trúc mã

| File | Nội dung |
|---|---|
| `dong-doi.html` | Toàn bộ game |
| `qa.js` | Kiểm thử engine + mô phỏng cân bằng |
| `qa-ui.js` | Kiểm thử giao diện trên DOM giả |
| `cost.py` | Mô hình chi phí hạ tầng AWS theo quy mô |

Bên trong `dong-doi.html` tách làm ba lớp:

- **`Engine`** — logic thuần, không chạm DOM, không chạm `localStorage`. Bê thẳng lên Node làm service được, không sửa dòng nào. Đây là cách giữ *server-authoritative* khi chưa có server.
- **`Luu`** — lưu trữ, tách riêng để sau này thay bằng lời gọi API.
- **Phần giao diện** — chỉ vẽ, không tính toán.

Sự kiện nằm trong mảng `SU_KIEN`, câu hỏi nằm trong `CAU_HOI`, cả hai đều thuần dữ liệu. Thêm nội dung chỉ cần thêm object, không đụng logic.

Khi viết câu hỏi mới, **đặt đáp án đúng ở vị trí đầu tiên** — `layDe()` tự xáo lại khi ra đề.

---

## Lộ trình

| Bản | Nội dung |
|---|---|
| **v0.1** ← hiện tại | Vòng lặp lõi, một người chơi, lưu trong trình duyệt |
| v0.2 | Thêm sự kiện, lớp 3–5, chỉ số Kỷ luật |
| v0.3 | Backend thật, tài khoản, chống gian lận |
| v0.4 | Lớp học nhiều người chơi — điểm khác biệt chính |
| v1.0 | Doanh thu, giấy phép G1, kiểm duyệt chat |

Cổng quan trọng nhất là **v0.1 → v0.2**: chơi thử 3 ngày bằng nhịp thật. Nếu không thấy muốn mở lại thì vấn đề nằm ở thiết kế, và thêm nội dung cũng không chữa được.

## Giới hạn hiện tại

- `qa-ui.js` chạy trên DOM giả tự dựng, không phải trình duyệt thật. Nó bắt được lỗi dựng lại DOM và luồng thao tác, nhưng không thay được việc mở game lên xem.
- Chưa test đa trình duyệt, khả năng tiếp cận bằng bàn phím và trình đọc màn hình.
- Tiến trình lưu trong `localStorage`, gắn theo đường dẫn file. Chuyển file sang thư mục khác là mất bản lưu.
- Số liệu trong `cost.py` là ước tính từ đơn giá tham chiếu, cần kiểm chứng bằng AWS Pricing Calculator trước khi dùng cho bất kỳ cam kết nào.
