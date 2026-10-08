# Tien Len Tinh Tien

App tinh tien choi bai Tien Len (Mien Nam).

## Chay

```bash
# Backend :30001
cd backend && npm install && npm run dev

# Frontend :3000 (proxy /api -> :30001)
cd frontend && npm install && npm run dev
```

## Luat tinh tien

- Moi loser tra Nhat: `laCon × donGiaLa` + thoi + cong.
- Bet (hang 4) con ≥ 10 la: den gap doi tien la (tuy chon `denBetGapDoi`).
- Cong: + `tienCong` cho Nhat.
- Thoi heo/tu quy: + `soTien` cho Nhat.
- Chat: tien truc tiep nguoiBiChat → nguoiChat.
- Toi trang: 3 nguoi con lai moi nguoi tra `toiTrangTien` cho nguoi toi trang.

## API

- `GET /api/health`
- `GET/POST /api/players`, `PUT/DELETE /api/players/:id`
- `GET/POST /api/games`, `GET/DELETE /api/games/:id`
- `POST /api/games/:id/rounds`, `DELETE /api/games/:id/rounds/:roundId`
- `GET /api/games/:id/settlement`
