# Chức năng + Điều kiện — App Tiến Lên Tính Tiền

> Nguồn: `backend/src` + `frontend/src` (09/10/2026). Mỗi mục: chức năng, điều kiện cho phép, điều kiện chặn/lỗi.

## Quy ước chung

- Bàn (Game) = 1 phiên chơi/ngày, 2–4 người (`backend/src/controllers/gamesController.ts:14`).
- Ván nhập tiền trực tiếp `+/-`, ô trống = 0, không áp luật lá/chặt/thối (`backend/src/services/calculator.ts:7`).
- Lỗi async bất ngờ → 500 JSON qua `ah()` (`backend/src/utils/asyncHandler.ts:4`, `backend/src/routes/games.ts:6`).
- Lưu trữ: có `DATABASE_URL` → Postgres bảng `app_state(id='main')`, không thì file JSON; đọc lỗi → fallback (`backend/src/services/store.ts:100`).
- `express.json({limit:'2mb'})` để chứa avatar dataURL; nếu có `frontend/dist` thì 1 service vừa API vừa FE (`backend/src/app.ts:12`).

## 1. Bàn chơi (Game)

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 1.1 | Danh sách `GET /api/games` | Luôn cho phép. Trả gọn: `rounds: undefined` + `soVan`. Dropdown header hiện `name - ngày chơi`, tick bàn đang chọn (`frontend/src/App.tsx:310`). | — |
| 1.2 | Tạo bàn `POST /api/games` | `playerIds` mảng 2–4 id, tất cả tồn tại. `ngayChoi` đúng `YYYY-MM-DD`, sai → lấy hôm nay. `maxVan` ép 1–99 (default 15), `cuoc` ép ≥0 (default 10000). Tên trống → `Bàn dd/mm/yyyy` (+`(n)` nếu trùng ngày). FE (`frontend/src/App.tsx:168`): ngày đúng regex, `checked` 2–4 người, tên tự sinh `Bàn N` tăng dần bỏ qua tên đã có; chỉ gửi `{name, playerIds, ngayChoi}` (không còn nhập maxVán/cược trên UI). | `<2`/`>4` → 400 `Moi ban 2-4 nguoi`. Id lạ → 400 `Player khong ton tai`. FE hiện modal `errDlg`: `Ngày chơi chưa đúng` / `Chọn ít nhất 2 người` / `Tối đa 4 người một bàn`. |
| 1.3 | Chi tiết `GET /api/games/:id` | Id tồn tại → trả full `playerIds, nghiIds, rounds, maxVan, cuoc`. FE `loadAll(id)` nạp lại players/games/totals + detail (`frontend/src/App.tsx:56`). | Không tồn tại → 404 `Khong tim thay game`; FE catch → `selectedId=null`. Chưa chọn bàn → panel `Chon mot ban de xem chi tiet`, nút THÊM VÁN disable. |
| 1.4 | Sửa `PUT /api/games/:id` | `name` trim non-empty. `playerIds` 2–4 + tồn tại, tự lọc `nghiIds` khỏi người bị loại. `nghiIds` là mảng, thuộc bàn, giữ `playerIds - nghiIds ≥ 2`. `ngayChoi` đúng regex. `maxVan` số 1–99. `cuoc` số ≥0. | `name` rỗng → 400. `playerIds` sai số lượng → 400. `nghiIds` ngoài bàn → 400 `co nguoi khong thuoc ban`. Còn `<2` người chơi → 400 `it nhat 2 nguoi dang choi`. |
| 1.5 | Xóa `DELETE /api/games/:id` | Luôn cho phép (lọc im lặng, không 404). FE mở modal `confirmDlg`: `Xóa bàn "X"?` → OK mới xóa (`frontend/src/App.tsx:262`). Nút 🗑 ngay trong dropdown. | Hủy modal → không xóa. Xóa bàn đang chọn → reset `selectedId/detail=null` + `loadAll(null)`. |
| 1.6 | Nhân bản `POST /:id/duplicate` (BE only) | Bản gốc tồn tại. Copy `playerIds/nghiIds/maxVan/cuoc`, tên `+ (moi)`, ngày = hôm nay, `rounds=[]`. FE có `api.duplicateGame` nhưng chưa gắn nút. | Không tồn tại → 404. |
| 1.7 | Reset ván `DELETE /:id/rounds` (BE only) | Game tồn tại → `rounds=[]`. FE có `api.resetRounds` nhưng chưa gắn nút. | Không tồn tại → 404. |
| 1.8 | Chọn/chuyển bàn | Click item → `openGame(id)` + `loadAll(id)`; toàn bộ thành viên/tổng/ván load lại theo `tableId`, không trộn bàn. | `api.game` lỗi → `selectedId=null`. |

## 2. Người chơi (Player)

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 2.1 | Tạo `POST /api/players` | `name` trim non-empty. `avatar` tùy chọn `data:image/...`, `length ≤ 550000` (~400KB) (`backend/src/controllers/playersController.ts:6`). FE modal Thêm thành viên (`frontend/src/App.tsx:223`): file `type.startsWith('image/')` → FileReader dataURL + preview 📷; tạo xong auto-check vào bàn tạo mới nếu còn chỗ (<4). | Tên rỗng → 400 `name la bat buoc` / FE `Nhap ten nguoi choi`. Sai loại file → `Chi chon file anh`. Quá to → `Anh qua lon`. |
| 2.2 | Sửa `PUT /api/players/:id` | Id tồn tại. `name` nếu gửi thì trim. `avatar !== undefined` thì qua `avatarOf` (cho phép xóa ảnh). FE đổi tên bằng modal `renameDlg` (input + Enter/OK, `frontend/src/App.tsx:208`): tên mới trim non-empty mới gọi API. Có 2 entry: ✎ trong modal tạo bàn (`renameMemberInCreate`) và (trước đây) picker. | Không tồn tại → 404. Avatar quá to → 500/400 `Anh qua lon`. Tên mới rỗng → `errDlg: Nhập tên mới`. |
| 2.3 | Xóa `DELETE /api/players/:id` | Chỉ khi id không nằm trong `playerIds` của mọi game. FE trong modal tạo bàn: modal `confirmDlg` `Xóa thành viên "X" khỏi app?` → OK mới xóa + bỏ check (`frontend/src/App.tsx:193`). | Đã chơi game → 400 `Player da choi game, khong xoa duoc` → hiện `errDlg`. Hủy modal → không xóa. |
| 2.4 | Tổng toàn cục `GET /api/players/totals` | Luôn cho phép. Cộng dồn `ketQua.tong` mọi bàn + đếm `soVan`; người chưa chơi → `0`. | — |

## 3. Thành viên bàn + Đang chơi/Nghỉ

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 3.1 | Mở chọn thành viên | Nút ＋ khi `inGame < 4` → `MemberPicker` (`frontend/src/components/MemberPicker.tsx:14`): tick chọn local `sel`, tìm kiếm `name.includes(q)`, quá 4 báo lỗi inline trong dialog, OK mới áp dụng / Hủy bỏ qua. | Chưa chọn bàn (`canToggle=false`) → chỉ xem, nút OK disable + hint `Chon ban choi truoc...`. |
| 3.2 | Chốt danh sách `confirmMembers` (`frontend/src/App.tsx:279`) | `ids` 2–4 người. Đóng picker rồi `PUT {playerIds: ids}` + reload. | `<2` → `errDlg: Bàn phải có ít nhất 2 người`. `>4` → `errDlg: Bàn tối đa 4 người`. Bỏ chọn người đã có điểm trong `detail.rounds` → `errDlg: ...đã có điểm..., không thể bỏ chọn` (BE không chặn case này, FE chặn). |
| 3.3 | Bật/tắt Đang chơi `togglePlaying` | Click avatar → đảo `nghiIds`, giữ `playerIds - nghiIds ≥ 2`. Hiển thị xanh `Đang chơi` / xám `Nghỉ` + `dot` (`frontend/src/App.tsx:350`). | Còn `<2` người chơi → `errDlg: Bàn phải có ít nhất 2 người đang chơi`, không gọi API. |
| 3.4 | Ván mới chỉ gồm người đang chơi | `RoundDialog members={playing}` (đã trừ `nghiIds`). BE `strictPlaying=true`: `scores.length == playing.length`, mọi id thuộc `playing` (`backend/src/controllers/gamesController.ts:111`). | Thiếu/thừa/người nghỉ → 400 `phai co du N nguoi dang choi` / `khong dang choi`. |

## 4. Ván (Round)

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 4.1 | Mở dialog thêm ván | Nút `＋ THÊM VÁN MỚI` (disable khi chưa chọn bàn). `tryOpenRound` chỉ cần `playing ≥ 2` (không còn chặn maxVán trên FE). Dialog liệt kê đúng `playing.length` người. | `playing < 2` → `errDlg: Cần ít nhất 2 người đang chơi`. |
| 4.2 | Nhập + lưu `POST /:id/rounds` | FE `canSave = members ≥ 2 && hasAny(≥1 ô non-empty) && !saving` (`frontend/src/components/RoundDialog.tsx:20`). Mỗi ô `Number(v)\|\|0`, trống = 0, preview `+xđ/-xđ`, tổng ván live. BE: `scores ≥ 2`, không trùng id, `amount` hữu hạn, `hang` là number nếu có. Lưu `vanSo = rounds.length+1`, `createdAt=ISO`, `ketQua=calculateRound` (`amount→tong`, `chiTiet=+10/-5`). Xong: luôn đọc loa `speakScores`, đóng dialog, reload. | Chưa nhập ô nào → nút Lưu disable + hint `Nhập điểm cho ít nhất 1 người`. `scores<2` → 400. Trùng → 400 `trung nguoi`. Amount NaN → 400 `amount phai la so`. Game không tồn tại → 404. `members=0` → `Ban chua co ai dang choi`. |
| 4.3 | Danh sách ván | `[...rounds].reverse()` (mới nhất đầu). Card `#vanSo + giờ đầy đủ fmtFull + ✔ Đã hoàn thành`, grid ngang `repeat(N, minmax(0,1fr))`, badge Nhất/Nhì/Ba/Bét theo điểm giảm dần hoặc `hang` lưu sẵn. Đếm header `N ván` (không còn `N/max`). Rỗng → `Chua co van nao...`. | — |
| 4.4 | Sửa `PUT /:id/rounds/:roundId` | Menu ⋮ → Chỉnh sửa → draft = điểm hiện tại, sửa cả hàng, hiện `Tổng draft`, Lưu gọi `onCommitRow`. BE `strictPlaying=false`: chỉ cần thuộc `playerIds` (sửa được cả người đã nghỉ). `ghiChu` string thì cập nhật. | Game/ván không tồn tại → 404. Scores lỗi → 400, hiện `err` trong card, không đóng editor. |
| 4.5 | Xem chi tiết | Menu ⋮ → modal table `tên (+hạng) + điểm + tổng ván`. | — |
| 4.6 | Xóa `DELETE /:id/rounds/:roundId` | Menu ⋮ → Xóa → modal `confirmDlg: Xóa ván lúc <label>?` → OK mới `api.deleteRound` + reload (`frontend/src/App.tsx:141`). BE lọc + đánh lại `vanSo=idx+1`. | Hủy modal → không xóa. |
| 4.7 | Đọc điểm TTS | `speakScores()` Web Speech API `vi-VN` rate 0.95 (`frontend/src/utils/sound.ts:2`). Gọi sau lưu ván (luôn đọc, không còn toggle 🔊/🔇) + nút 🔊 từng card. | Không hỗ trợ → bỏ qua silent. |

## 5. Tổng tiền / quyết toán / hiển thị

| # | Chức năng | Điều kiện cho phép | Điều kiện chặn / lỗi |
|---|---|---|---|
| 5.1 | Tổng trong bàn | `totalsOf(pid)=sum(ketQua.tong)` theo `detail.rounds`; chưa chọn bàn → fallback tổng toàn cục. Khung `🏆 Tổng tiền hiện tại` lưới ngang, `fmtSigned +xđ` xanh / `-xđ` đỏ. | `hideTotals=true` → mask `••••`. |
| 5.2 | Ẩn/hiện tiền | Nút 🙈/👁 trong khung tổng (không còn trên header), lưu `localStorage hideTotals`, mặc định ẩn (`frontend/src/App.tsx:43`). RoundCard hiện luôn hiện số (không còn mask từng ván). | — |
| 5.3 | Quyết toán `GET /:id/settlement` (BE only) | `tongThuChi`, `soVanDuong` (đếm `tong>0`), `debts` greedy âm→dương, dung sai `<1`. FE định nghĩa type nhưng chưa gọi hiển thị. | Game không tồn tại → 404. |

## 6. Khung UI / hạ tầng

| # | Chức năng | Điều kiện / ghi chú |
|---|---|---|
| 6.1 | Header | `🃏 Tiến Lên Tính Tiền` + dropdown `📅 name - ngày ▾` (list + tick + 🗑 xóa nhanh + `+ Tạo bàn mới`) + nút `＋ Thêm`. Không còn nút ẩn tiền / loa trên header như bản cũ. |
| 6.2 | Modal hệ thống | `errDlg` (⚠️ Không thể thực hiện + Đã hiểu), `confirmDlg` (⚠️ Xác nhận + Hủy/OK), `renameDlg` (Đổi tên + Hủy/OK) thay cho `alert/confirm/prompt`. |
| 6.3 | Collapsible | `Chi tiết bàn chơi` (`membersOpen`) và `Danh sách ván` (`roundsOpen`) click header thu/mở, mặc định mở. |
| 6.4 | Định dạng | `fmtFull` (HH:mm dd/mm/yyyy), `fmtDay` (+`Hôm nay`), `fmtSigned`, `fmtNum vi-VN`. |
| 6.5 | Hạng `ranksFor` | 2n `[×2,-2]`, 3n `[1,0,-1]`, 4n `[2,1,-1,-2]` (`frontend/src/utils/ranks.ts:9`) — có sẵn nhưng dialog vẫn nhập tay, chưa đấu nối. |
| 6.6 | Health check | `GET /api/health → {ok:true}`. |

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

## 8. Chưa có so với spec

- Chưa nhân `cược × hạng`, chưa thối/chặt/tới trắng/đền bét; chưa bắt `sum(ván)=0`.
- Chưa dùng `settlement/duplicate/reset` trên UI; `maxVan/cuoc/hang/ghiChu` đã lưu ở BE nhưng UI tạo bàn không còn nhập `maxVan/cuoc`.
