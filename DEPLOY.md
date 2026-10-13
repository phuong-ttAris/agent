# Deploy app (1 service Render + Postgres Neon free)

Kien truc: 1 web service tren Render vua chay API vua serve FE da build.
Du lieu luu Postgres (bien `DATABASE_URL`); khong co thi dung file local.

## 1. Tao database free (Neon)

1. Vao https://neon.tech → Sign up → New project (region Singapore cho gan VN).
2. Copy **Connection string** (dang `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/db?sslmode=require`).
3. Khong can tao bang tay — app tu tao bang `app_state` lan chay dau tien.

## 2. Day code len GitHub

```bash
cd tien-len-app
git init
git add -A
git commit -m "tien len app"
# tao repo TRONG tren github.com (khong tick README), roi:
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

## 3. Deploy tren Render

1. https://dashboard.render.com → New → **Web Service** → chon repo.
2. Cau hinh:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node 20 (mac dinh duoc)
3. Tab **Environment** → Add `DATABASE_URL` = connection string Neon.
4. Create Web Service → doi build (~3-5 phut) → mo URL `https://<ten>.onrender.com`.

## Luu y

- Free tier Render **sleep sau ~15 phut khong co request** (khong chinh duoc). App tu ping `/api/health` moi 10 phut khi con nguoi dung trong 30 phut gan nhat (dung `RENDER_EXTERNAL_URL` do Render tu dat), nen thuc te chi sleep sau ~30-40 phut khong ai dung — request dau tien sau do mat ~30-60s de day.
- Moi lan push len `main`, Render tu deploy lai, **du lieu van con** (nam o Neon).
- Doi ten mien: Settings → Custom Domain (tuy chon).
- Log loi: tab Logs tren Render.
