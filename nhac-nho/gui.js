/* Gửi thông báo nhắc học. GitHub Actions chạy tệp này mỗi 30 phút (.github/workflows/nhac.yml).
   Đọc users/<uid>/docs/nhac trên Firestore: ai đã qua giờ nhắc (gio, theo múi giờ tz), hôm nay chưa học (ngay) và chưa được nhắc (gui) thì gửi.
   Cần hai khoá bí mật trong Settings → Secrets and variables → Actions của kho: FIREBASE_SA (tệp JSON tài khoản dịch vụ Firebase) và VAPID_PRIVATE. */
const admin = require('firebase-admin'), webpush = require('web-push');
const VAPID_PUB = 'BNgZgf6w64sD5qCGc3WoM39I97UV2FHRd-xqNyB8eyIc7dym7Nf1XZxtP49hQrmsk1arWT4sNtuEchTT6m7COpM';
const SITE = 'https://havu.github.io/so-luyen-tu/';
if (!process.env.FIREBASE_SA || !process.env.VAPID_PRIVATE) { console.log('Chưa có khoá FIREBASE_SA hoặc VAPID_PRIVATE, bỏ qua.'); process.exit(0); }
admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SA))});
webpush.setVapidDetails(SITE, VAPID_PUB, process.env.VAPID_PRIVATE.trim());
const db = admin.firestore(), now = new Date(), dry = process.argv.includes('--thu');
function local(tz){
  const f = new Intl.DateTimeFormat('en-CA', {timeZone:tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'}).formatToParts(now);
  const g = t => f.find(p => p.type === t).value; return {day:g('year') + '-' + g('month') + '-' + g('day'), hour:+g('hour')};
}
function body(x){
  const n = x.chuoi || 0;
  if (n >= 2) return 'Anh đang giữ chuỗi ' + n + ' ngày học liền. Hôm nay chưa học, vào ôn vài phút cho khỏi đứt chuỗi nhé.';
  return 'Hôm nay anh chưa học. Vào ôn vài phút cho từ khỏi quên nhé.';
}
(async () => {
  let sent = 0, skip = 0;
  for (const u of await db.collection('users').listDocuments()){
    const ref = u.collection('docs').doc('nhac'), snap = await ref.get(); if (!snap.exists) continue;
    const x = snap.data(), subs = Object.entries(x.subs || {}).filter(([, v]) => v); if (!subs.length) continue;
    let tz = x.tz || 'Asia/Ho_Chi_Minh', L; try { L = local(tz); } catch (e) { L = local('Asia/Ho_Chi_Minh'); }
    const gio = x.gio == null ? 20 : x.gio;
    if (L.hour < gio || L.hour >= 23 || x.ngay === L.day || x.gui === L.day) { skip++; continue; }
    const payload = JSON.stringify({title:'Sổ luyện từ', body:body(x), url:SITE});
    const dead = {};
    for (const [dev, s] of subs){
      if (dry) { console.log('thử: sẽ gửi tới', u.id, dev); continue; }
      try { await webpush.sendNotification(JSON.parse(s), payload, {TTL:3 * 3600, urgency:'normal'}); sent++; }
      catch (e) { console.log('lỗi', u.id, dev, e.statusCode || e.message); if (e.statusCode === 404 || e.statusCode === 410) dead[dev] = null; }
    }
    if (!dry) await ref.set(Object.keys(dead).length ? {gui:L.day, subs:dead} : {gui:L.day}, {merge:true});
  }
  console.log('đã gửi', sent, 'thông báo; bỏ qua', skip, 'người');
})().catch(e => { console.error(e); process.exit(1); });
