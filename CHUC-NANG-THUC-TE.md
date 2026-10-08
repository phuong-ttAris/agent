# Chức năng + Điều kiện — App Tiến Lên Tính Tiền

> Nguồn: `backend/src` + `frontend/src` (07/10/2026). Mỗi mục gồm: chức năng, điều kiện cho phép, điều kiện chặn/lỗi.

## Quy ước chung

- Bàn (Game) = 1 phiên chơi/ngày, tối đa 4 người, tối thiểu 2 người.
- Ván (Round) nhập tiền trực tiếp `+/-`, ô trống = 0, không áp luật lá/chặt/thối (`backend/src/services/calculator.ts:7`).
- Lưu trữ file JSON `backend/src/data/db.json` qua `readDb`/`writeDb`.

## 1. Bàn chơi (Game)

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 1.1 | Danh sách bàn `GET /api/games` | Luôn cho phép. Trả gọn: ẩn `rounds`, thêm `soVan`. | — |
| 1.2 | Tạo bàn `POST /api/games` | `playerIds` là mảng 2–4 id, tất cả tồn tại trong `players`. `ngayChoi` đúng `YYYY-MM-DD`, sai → lấy hôm nay. `maxVan` ép `1–99` (default 15). `cuoc` ép `>=0` floor (default 10000). Tên trống → tự sinh `Bàn dd/mm/yyyy` (+ `(n)` nếu trùng ngày). FE: `checked.length` 2–4, ngày đúng regex mới gọi API. | `<2` hoặc `>4` → 400 `Moi ban 2-4 nguoi`. `pid` không tồn tại → 400 `Player khong ton tai`. FE `alert`: `Chon it nhat 2 nguoi` / `Toi da 4 nguoi mot ban` / `Ngay choi chua dung`. |
| 1.3 | Xem chi tiết `GET /api/games/:id` | `id` tồn tại. | Không tồn tại → 404 `Khong tim thay game`. FE: hiện `Chon mot ban de xem chi tiet` khi `detail==null`. |
| 1.4 | Sửa bàn `PUT /api/games/:id` | `name` non-empty sau trim. `playerIds` 2–4 + tồn tại; tự lọc `nghiIds` khỏi người bị loại. `nghiIds` là mảng, mọi id thuộc bàn, giữ `playerIds - nghiIds >= 2`. `ngayChoi` đúng regex. `maxVan` số `1–99`. `cuoc` số `>=0`. | `name` rỗng → 400. `playerIds` sai số lượng → 400. `nghiIds` chứa người ngoài bàn → 400 `co nguoi khong thuoc ban`. Còn `<2` người chơi → 400 `it nhat 2 nguoi dang choi`. FE `togglePlaying` chặn + `alert` tương tự. |
| 1.5 | Xóa bàn `DELETE /api/games/:id` | Luôn cho phép, không kiểm tra ván. FE: `confirm('Xoa ban ...?')`. | Không 404 (filter im lặng). Nếu xóa bàn đang chọn → reset `selectedId/detail=null`. |
| 1.6 | Nhân bản `POST /:id/duplicate` (BE only, FE chưa gắn nút) | `src` tồn tại. Copy `playerIds/nghiIds/maxVan/cuoc`, tên `+ (moi)`, ngày = hôm nay, `rounds=[]`. | Không tồn tại → 404. |
| 1.7 | Reset ván `DELETE /:id/rounds` (BE only) | Game tồn tại → `rounds=[]`. | Không tồn tại → 404. |
| 1.8 | Chặn quá số ván + đếm | FE cho mở dialog chỉ khi: đã chọn bàn + `playing.length>=2` + `rounds.length < maxVan`. Header đếm `rounds.length/maxVan`. | Chưa chọn bàn → nút disable. `<2` người chơi → `alert('Can it nhat 2 nguoi dang choi')`. Đủ ván → `alert('Da du so van toi da')`. |
| 1.9 | Chọn/chuyển bàn | Click item trong dropdown → `loadAll(id)`. Dữ liệu (thành viên, tổng, ván, cấu hình) load lại theo `tableId`, không trộn bàn. | `api.game(id)` lỗi → `setSelectedId(null)`. |

## 2. Người chơi (Player)

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 2.1 | Tạo `POST /api/players` | `name` trim non-empty. `avatar` tùy chọn: chuỗi `data:image/...` và `length<=550000` (~400KB). FE: input tên + chọn ảnh preview, file phải `type.startsWith('image/')`. | Tên rỗng → 400 `name la bat buoc` / FE `Nhap ten nguoi choi`. File không phải ảnh → `Chi chon file anh`. Ảnh to → `Anh qua lon`. |
| 2.2 | Sửa `PUT /api/players/:id` | `id` tồn tại. `name` nếu gửi thì trim. `avatar` nếu gửi thì qua cùng check `avatarOf` (cho phép xóa bằng `undefined`). | Không tồn tại → 404. Avatar sai định dạng → bỏ qua (undefined); quá to → 400 `Anh qua lon`. FE rename: `prompt`, hủy/trùng tên cũ → không gọi API. |
| 2.3 | Xóa `DELETE /api/players/:id` | Chỉ khi id không nằm trong `playerIds` của bất kỳ game nào. FE: `confirm('Xoa thanh vien nay?')`. | Đã chơi game → 400 `Player da choi game, khong xoa duoc`, FE `alert` lỗi. |
| 2.4 | Tổng toàn cục `GET /api/players/totals` | Luôn cho phép. Cộng dồn `ketQua.tong` mọi bàn + đếm `soVan`. Người chưa chơi ván nào → `tong=0, van=0`. | — |
| 2.5 | Tìm kiếm + tạo nhanh (MemberPicker) | Ô tìm kiếm lọc `name.toLowerCase().includes(q)`. Radio thêm/bỏ chỉ khi `canToggle` (đã chọn bàn). Tạo mới: tên non-empty, Enter hoặc nút `Tạo thành viên mới`. | Chưa chọn bàn → chỉ xem + tạo, hiện `Chon ban choi truoc...`, click radio không tác dụng. Bàn đủ 4 người → `alert('Ban da du 4 nguoi...')`, người mới vẫn tạo global nhưng không auto-add. |

## 3. Thành viên bàn + trạng thái Đang chơi/Nghỉ

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 3.1 | Thêm thành viên vào bàn `toggleMember` | Bàn chưa đủ 4 người + `pid` chưa trong bàn → `PUT {playerIds:[...old,pid]}`. | Đủ 4 → `alert('Ban da du 4 nguoi')`. |
| 3.2 | Xóa thành viên khỏi bàn | Người trong bàn + chưa có điểm nào trong `detail.rounds` + sau xóa còn `>=2` người + `confirm('Xoa thanh vien...?')`. | Đã có điểm → `alert('Nguoi nay da co diem trong ban, khong xoa duoc')`. Còn `<=2` người → `alert('Ban phai co it nhat 2 nguoi')`. |
| 3.3 | Bật/tắt Đang chơi `togglePlaying` | Click avatar → đảo `nghiIds`. Giữ `playerIds - nghiIds >= 2`. Hiển thị: đang chơi = bubble màu + `pill on` + `dot on`; nghỉ = xám + `Nghỉ`. | Còn `<2` người chơi → `alert` + không gọi API. |
| 3.4 | Ván mới chỉ gồm người đang chơi | `RoundDialog members={playing}` (đã lọc `nghiIds`). BE `strictPlaying=true`: `scores.length == playing.length` và mọi `playerId` thuộc `playing`. | Thiếu/thừa người hoặc chứa người nghỉ → 400 `phai co du N nguoi dang choi` / `co nguoi khong dang choi`. |

## 4. Ván (Round)

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 4.1 | Mở dialog thêm ván | `detail != null` + `playing>=2` + `rounds < maxVan` (xem 1.8). Dialog liệt kê đúng `playing.length` người. | Không thỏa → `alert` tương ứng, không mở dialog. |
| 4.2 | Nhập + lưu ván `POST /:id/rounds` | FE `canSave = members>=2 && hasAny(≥1 ô non-empty) && !saving`. Mỗi ô `Number(v)\|\|0`, trống=0. Hiện tổng ván live + preview `+xđ/-xđ`. BE: `scores>=2`, không trùng `playerId`, `amount` hữu hạn (`Number.isFinite`), `hang` nếu có phải là `number`. Lưu: `vanSo = rounds.length+1`, `createdAt=ISO`, `ketQua=calculateRound`. Xong: đóng dialog, đọc loa nếu `soundOn`, reload bàn. | Chưa nhập ô nào → nút Lưu disable + hint `Nhap diem cho it nhat 1 nguoi`. `scores<2` → 400 `it nhat 2 nguoi`. Trùng người → 400 `trung nguoi`. Amount NaN → 400 `amount phai la so`. Game/ván không tồn tại → 404. |
| 4.3 | Danh sách ván | `rounds` đảo ngược (mới nhất đầu). Card gồm `#vanSo + giờ đầy đủ (fmtFull) + ✔ Đã hoàn thành`, grid ngang `repeat(N,1fr)`, badge Nhất/Nhì/Ba/Bét theo điểm giảm dần (hoặc `hang` nếu có). Hiện tổng ván `sum(tong)`. Rỗng → `Chua co van nao...`. | `hideTotals=true` → điểm mask `••`. Sửa inline bị ẩn khi đang mask (chỉ xem). |
| 4.4 | Sửa ván `PUT /:id/rounds/:roundId` | Menu ⋮ → Chỉnh sửa → draft khởi tạo = điểm hiện tại, cho sửa cả hàng, hiện `Tổng draft`. BE `strictPlaying=false`: chỉ cần thuộc `playerIds` (cho phép sửa cả người đã nghỉ). `ghiChu` nếu là string thì cập nhật. | Round/game không tồn tại → 404. Validate scores như 4.2 (trừ không bắt đủ playing). Lỗi → hiện `err` trong card, không đóng editor. |
| 4.5 | Xem chi tiết ván | Menu ⋮ → `Xem chi tiết` → modal table `tên (+hạng) + điểm + tổng ván`. | — |
| 4.6 | Xóa ván `DELETE /:id/rounds/:roundId` | Menu ⋮ → Xóa → `confirm('Xoa van luc <label>?')` → gọi API. BE lọc ván + đánh lại `vanSo=idx+1`. Tổng bàn tự cập nhật khi reload. | Hủy confirm → không xóa. |
| 4.7 | Đọc điểm (TTS) | `speakScores()` Web Speech API `vi-VN`, rate 0.95: `Kết quả ván: <tên> được/mất <số> đồng`. Kích hoạt: sau lưu ván + nút 🔊 từng card. Toggle 🔊/🔇 lưu `localStorage soundOn` (mặc định bật). Tắt → `speechSynthesis.cancel()`. | Trình duyệt không hỗ trợ → bỏ qua silent. |

## 5. Tổng tiền / quyết toán / hiển thị

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 5.1 | Tổng trong bàn | `totalsOf(pid)=sum(ketQua.tong)` theo `detail.rounds`. Khung `🏆 Tổng tiền hiện tại` lưới ngang, `fmtSigned`: `+xđ` xanh (`.pos`) / `-xđ` đỏ (`.neg`). | Chưa chọn bàn → fallback tổng toàn cục. `hideTotals=true` → mask `••••`. |
| 5.2 | Ẩn/hiện tiền | Nút 🙈/👁 header + item menu từng card. Lưu `localStorage hideTotals` (mặc định `true`=ẩn). | — |
| 5.3 | Quyết toán `GET /:id/settlement` (BE only) | Luôn tính được: `tongThuChi`, `soVanDuong` (đếm ván `tong>0`), `debts` greedy (âm trả dương, `min(-debtor,creditor)`, dung sai `<1`). | Game không tồn tại → 404. FE chưa gọi hiển thị (chỉ định nghĩa type `Settlement`). |

## 6. Tiện ích UI / hạ tầng

| # | Chức năng | Điều kiện |
|---|---|---|
| 6.1 | Header + dropdown bàn | Nút `📅 <name> - <ngày> ▾` mở menu: list `name - ngày`, tick bàn hiện tại, nút 🗑 xóa nhanh (stopPropagation + đóng menu), `+ Tạo bàn mới`. Nút `＋` header mở modal tạo bàn. |
| 6.2 | Collapsible panel | `Chi tiết bàn chơi` (`membersOpen`) và `Danh sách ván` (`roundsOpen`) click header để thu/mở, mặc định mở. |
| 6.3 | Định dạng | `fmtFull` (HH:mm dd/mm/yyyy), `fmtDay` (+`Hôm nay` nếu trùng ngày), `fmtSigned`, `fmtNum` (`vi-VN`), `shortCode` (4 ký tự cuối id). |
| 6.4 | Hạng `ranksFor` (chưa đấu nối) | 2 người `[Nhất×2, Bét×-2]`; 3 người `[1,0,-1]`; 4 người `[2,1,-1,-2]`. File `utils/ranks.ts` có sẵn nhưng dialog hiện nhập tay. |
| 6.5 | Health check | `GET /api/health → {ok:true, service:'tien-len-backend'}`. |

## 7. Bảng API

```
GET  /api/health
GET  /api/players | POST /api/players | PUT/DELETE /api/players/:id
GET  /api/players/totals
GET  /api/games | POST /api/games | GET/PUT/DELETE /api/games/:id
POST /api/games/:id/duplicate | DELETE /api/games/:id/rounds
POST /api/games/:id/rounds | PUT/DELETE /api/games/:id/rounds/:roundId
GET  /api/games/:id/settlement
```

## 8. Chưa có so với spec CHUC-NANG.md

- Chưa nhân `cuoc × hạng`, chưa thối heo/tứ quý, chặt, tới trắng, đền bét gấp đôi — nhập tay.
- Chưa bắt `sum(ván)=0`; chưa dùng `settlement/duplicates/reset` trên UI; `cuoc/hang/ghiChu` đã lưu nhưng chưa có input.
