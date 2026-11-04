/* QA harness cho Dòng Đời v0.1 — chạy: node qa.js
 *
 * Engine được rút thẳng ra từ dong-doi.html rồi nạp vào, nên test luôn chạy
 * đúng đoạn mã mà game đang dùng — không có bản sao nào để lệch nhau. */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "dong-doi.html"), "utf8");
const khop = html.match(/const Engine = \(\(\) => \{[\s\S]*?\n\}\)\(\);/);
if (!khop) {
  console.error("Không tìm thấy khối Engine trong dong-doi.html — engine đã đổi cấu trúc?");
  process.exit(2);
}
const E = new Function(khop[0] + "\nreturn Engine;")();

let pass = 0, fail = 0;
const loi = [];
function check(ten, dk, chiTiet) {
  if (dk) { pass++; }
  else { fail++; loi.push(ten + (chiTiet ? " → " + chiTiet : "")); }
}

/* RNG tất định để test lặp lại được */
function mkRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const NOW = 1700000000000;
function moi(nhanh = true) {
  const s = E.taoNhanVat("Test", "nam", NOW);
  s.nhanh = nhanh;
  return s;
}

/* ---------- T1: lịch năm học ---------- */
{
  const phases = [];
  for (let i = 1; i <= E.NGAY_NAM; i++) phases.push(E.phaNgay(i).ma);
  check("T1.1 lịch 7 ngày đúng thứ tự",
    JSON.stringify(phases) === JSON.stringify(["hk1","hk1","hk1","gk","hk2","hk2","ck"]),
    phases.join(","));
  check("T1.2 có đúng 2 ngày thi",
    phases.filter(p => p === "gk" || p === "ck").length === 2);
}

/* ---------- T2: hai trục tuổi ---------- */
{
  const s = moi(true);
  E.tick(s, NOW);
  check("T2.1 tuổi khởi điểm = 6", Math.abs(E.tuoi(s) - 6) < 0.001, E.tuoi(s));

  const mot_nam = E.msMotNam(true);
  E.tick(s, NOW + mot_nam);
  check("T2.2 sau 1 năm thật → 7 tuổi", Math.abs(E.tuoi(s) - 7) < 0.01, E.tuoi(s));
  check("T2.3 lớp KHÔNG tự tăng theo thời gian", s.lop === 1, "lop=" + s.lop);

  const t = E.tinhTrang(s);
  check("T2.4 lệch 1 năm → chậm tiến độ", t.ma === "cham", t.ma);

  // đổi chế độ giữa chừng không được làm nhảy tuổi
  const s2 = moi(true);
  E.tick(s2, NOW + E.msMotNam(true) / 2);
  const tuoiTruoc = E.tuoi(s2);
  s2.nhanh = false; s2.moc = NOW + E.msMotNam(true) / 2;
  E.tick(s2, NOW + E.msMotNam(true) / 2);
  check("T2.5 đổi chế độ không nhảy tuổi", Math.abs(E.tuoi(s2) - tuoiTruoc) < 0.001,
    tuoiTruoc + " → " + E.tuoi(s2));
}

/* ---------- T3: AP ---------- */
{
  const s = moi(true);
  s.ap = 0; s.mocAp = NOW;
  E.tick(s, NOW + E.msMotAp(true) * 5);
  check("T3.1 hồi đúng 5 AP", s.ap === 5, "ap=" + s.ap);

  E.tick(s, NOW + E.msMotAp(true) * 1000);
  check("T3.2 AP không vượt trần", s.ap === E.AP_MAX, "ap=" + s.ap);

  const s2 = moi(true);
  s2.ap = 1;
  const r = E.lamHanhDong(s2, "truong", "tuhoc", "toan", NOW);
  check("T3.3 chặn khi thiếu AP", !r.ok, JSON.stringify(r));
}

/* ---------- T4: hành động ---------- */
{
  const s = moi(true);
  const d0 = s.diem.toan;
  const r = E.lamHanhDong(s, "truong", "tuhoc", "toan", NOW);
  check("T4.1 tự học thành công", r.ok, JSON.stringify(r));
  check("T4.2 điểm Toán tăng", s.diem.toan > d0, d0 + " → " + s.diem.toan);
  check("T4.3 AP bị trừ", s.ap === E.AP_MAX - 3, "ap=" + s.ap);

  // tâm trạng thấp giảm hiệu quả
  const a = moi(true), b = moi(true);
  a.tamTrang = 90; b.tamTrang = 10;
  E.lamHanhDong(a, "truong", "tuhoc", "toan", NOW);
  E.lamHanhDong(b, "truong", "tuhoc", "toan", NOW);
  check("T4.4 tâm trạng thấp → học kém hiệu quả hơn",
    (a.diem.toan - 5) > (b.diem.toan - 5) * 1.5,
    `vui=${(a.diem.toan-5).toFixed(3)} buồn=${(b.diem.toan-5).toFixed(3)}`);

  // chặn học vào ngày thi
  const c = moi(true); c.ngay = 4;
  check("T4.5 chặn học ngày thi", !E.lamHanhDong(c, "truong", "nghe", "toan", NOW).ok);

  // hành động không tồn tại
  check("T4.6 hành động lạ bị từ chối", !E.lamHanhDong(moi(), "truong", "xxx", "toan", NOW).ok);
  check("T4.7 địa điểm lạ bị từ chối", !E.lamHanhDong(moi(), "xxx", "tuhoc", "toan", NOW).ok);

  // monId sai → rơi về môn yếu nhất, không crash
  const d = moi(true);
  const rr = E.lamHanhDong(d, "truong", "tuhoc", "khongcomon", NOW);
  check("T4.8 môn sai không làm vỡ state", rr.ok && !Number.isNaN(E.dtb(d)), JSON.stringify(rr));
}

/* ---------- T5: chặn biên ---------- */
{
  const s = moi(true);
  for (let i = 0; i < 400; i++) { s.ap = 20; E.lamHanhDong(s, "san", "ban", null, NOW); }
  check("T5.1 tâm trạng không vượt 100", s.tamTrang <= 100, "tt=" + s.tamTrang);
  check("T5.2 giao tiếp không vượt 100", s.giaoTiep <= 100, "gt=" + s.giaoTiep);

  const s2 = moi(true);
  for (let i = 0; i < 400; i++) { s2.ap = 20; E.lamHanhDong(s2, "truong", "tuhoc", "toan", NOW); }
  check("T5.3 điểm môn không vượt 10", s2.diem.toan <= 10, "toan=" + s2.diem.toan);

  const s3 = moi(true);
  for (let i = 0; i < 400; i++) { s3.ap = 20; E.lamHanhDong(s3, "san", "bong", null, NOW); }
  check("T5.4 sức khoẻ không âm", s3.sucKhoe >= 0, "sk=" + s3.sucKhoe);
}

/* ---------- T6: đi ngủ ---------- */
{
  const s = moi(false); s.ap = 20;
  check("T6.1 nhịp thật: còn nhiều AP thì chưa ngủ được", !E.nguDay(s, NOW).ok);
  s.ap = 2;
  check("T6.2 hết AP thì ngủ được", E.nguDay(s, NOW).ok);
  check("T6.3 ngủ xong sang ngày 2", s.ngay === 2, "ngay=" + s.ngay);
  check("T6.4 ngủ xong AP đầy lại", s.ap === E.AP_MAX, "ap=" + s.ap);

  const s2 = moi(true); s2.ap = 20;
  check("T6.5 tua nhanh: ngủ bất kỳ lúc nào", E.nguDay(s2, NOW).ok);

  const s3 = moi(true); s3.ngay = 7;
  check("T6.6 ngày thi không ngủ được", !E.nguDay(s3, NOW).ok);
}

/* ---------- T7: thi ---------- */
{
  const rng = mkRng(42);
  const gioi = moi(true);
  for (const m of E.MON) gioi.diem[m.id] = 8.5;
  gioi.triTue = 70; gioi.theChat = 70; gioi.tamTrang = 80;
  const r1 = E.thiCuoiNam(gioi, rng);
  check("T7.1 học sinh giỏi thì đạt", r1.dat, "tb=" + r1.tb.toFixed(2));

  const kem = moi(true);
  for (const m of E.MON) kem.diem[m.id] = 2.0;
  kem.triTue = 20; kem.theChat = 20; kem.tamTrang = 20;
  const r2 = E.thiCuoiNam(kem, rng);
  check("T7.2 học sinh kém thì trượt", !r2.dat, "tb=" + r2.tb.toFixed(2));
  check("T7.3 trượt lần đầu được thi lại", r2.choThiLai);

  // điểm thi luôn trong 0..10
  let ngoai = 0;
  for (let i = 0; i < 2000; i++) {
    const s = moi(true);
    for (const m of E.MON) s.diem[m.id] = Math.random() * 10;
    s.triTue = Math.random() * 100; s.theChat = Math.random() * 100;
    s.tamTrang = Math.random() * 100;
    for (const k of E.thiCuoiNam(s, Math.random).kq) {
      if (k.diem < 0 || k.diem > 10 || Number.isNaN(k.diem)) ngoai++;
    }
  }
  check("T7.4 điểm thi luôn nằm trong 0–10 (2000 lượt)", ngoai === 0, "lệch=" + ngoai);

  // điểm liệt chặn lên lớp dù TB cao
  const liet = moi(true);
  liet.diem.toan = 10; liet.diem.van = 10; liet.diem.td = 0.1;
  liet.triTue = 50; liet.theChat = 0; liet.tamTrang = 50;
  const r3 = E.thiCuoiNam(liet, mkRng(7));
  check("T7.5 điểm liệt chặn lên lớp", !r3.dat || r3.liet.length === 0,
    `tb=${r3.tb.toFixed(2)} liet=${r3.liet.length} dat=${r3.dat}`);
}

/* ---------- T8: áp dụng kết quả ---------- */
{
  const s = moi(true); s.lop = 1; s.ngay = 7;
  E.apDungKetQua(s, { dat: true }, NOW);
  check("T8.1 đạt → lên lớp 2", s.lop === 2, "lop=" + s.lop);
  check("T8.2 năm mới về ngày 1", s.ngay === 1, "ngay=" + s.ngay);
  check("T8.3 điểm môn reset về mốc đầu năm", s.diem.toan < 5 && s.diem.toan > 4, s.diem.toan);

  const s2 = moi(true); s2.lop = 2; s2.ngay = 7;
  E.apDungKetQua(s2, { dat: false }, NOW);
  check("T8.4 trượt → ở lại lớp 2", s2.lop === 2, "lop=" + s2.lop);
  check("T8.5 đếm số lần lưu ban", s2.soLuuBan === 1, s2.soLuuBan);

  const s3 = moi(true); s3.lop = E.LOP_CUOI;
  E.apDungKetQua(s3, { dat: true }, NOW);
  check("T8.6 vượt lớp cuối → kết thúc", !!s3.ketThuc, JSON.stringify(s3.ketThuc));
}

/* ---------- T9: sự kiện ---------- */
{
  let hong = 0, thieuLc = 0;
  const mau = moi(true);
  // mọi sự kiện phải chạy được mọi lựa chọn mà không vỡ state
  const ids = [];
  for (let i = 0; i < 3000; i++) {
    const s = moi(true);
    s.lop = 1 + (i % 3); s.giaoTiep = i % 100; s.theChat = i % 100;
    s.sucKhoe = i % 100; s.tamTrang = i % 100;
    const id = (function bocThu() {
      const r = E.timSuKien("quenvo"); return r ? null : null;
    })();
  }
  // duyệt trực tiếp qua state đa dạng
  const tatCa = new Set();
  for (let i = 0; i < 8000; i++) {
    const s = moi(true);
    s.lop = 1 + (i % 3);
    s.giaoTiep = (i * 7) % 100; s.theChat = (i * 13) % 100;
    s.sucKhoe = (i * 3) % 100;  s.tamTrang = (i * 11) % 100;
    for (const m of E.MON) s.diem[m.id] = ((i * 5) % 100) / 10;
    s.ngay = 2;
    const before = JSON.stringify(s);
    const kq = E.nguDay(s, NOW);
    if (s.choSuKien) {
      tatCa.add(s.choSuKien);
      const sk = E.timSuKien(s.choSuKien);
      if (!sk) { hong++; continue; }
      if (!sk.lc || !sk.lc.length) { thieuLc++; continue; }
      for (let j = 0; j < sk.lc.length; j++) {
        const cp = JSON.parse(JSON.stringify(s));
        const r = E.chonSuKien(cp, sk.id, j);
        const okState = !Number.isNaN(E.dtb(cp)) && cp.tamTrang >= 0 && cp.tamTrang <= 100
                        && cp.sucKhoe >= 0 && cp.sucKhoe <= 100;
        if (!okState) hong++;
        if (!r.ok && !(sk.lc[j].dk && !sk.lc[j].dk(cp))) hong++;
      }
    }
  }
  check("T9.1 mọi sự kiện/lựa chọn không làm vỡ state", hong === 0, "hong=" + hong);
  check("T9.2 không sự kiện nào thiếu lựa chọn", thieuLc === 0);
  check("T9.3 lựa chọn ngoài phạm vi bị từ chối",
    !E.chonSuKien(moi(true), "quenvo", 99).ok);
  check("T9.4 id sự kiện lạ không làm sập", !E.chonSuKien(moi(true), "khongcosk", 0).ok);
  console.log(`      (bốc trúng ${tatCa.size} loại sự kiện khác nhau)`);
}

/* ---------- T10: mô phỏng cân bằng ---------- */
function moPhong(kieu, seed) {
  const rng = mkRng(seed);
  const s = moi(true);
  let batVo = 0;
  while (!s.ketThuc && batVo < 200) {
    batVo++;
    const pha = E.phaNgay(s.ngay);
    if (pha.thi) {
      if (pha.ma === "gk") { E.thiGiuaKy(s, rng); }
      else {
        let r = E.thiCuoiNam(s, rng);
        if (!r.dat && r.choThiLai) {
          s.daThiLai = true;
          for (const m of E.MON) s.diem[m.id] += 0.6;
          r = E.thiCuoiNam(s, rng);
        }
        E.apDungKetQua(s, r, NOW);
      }
      continue;
    }
    // tiêu hết AP theo chiến lược
    let guard = 0;
    while (s.ap >= 1 && guard++ < 60) {
      if (kieu === "cham") {
        if (s.tamTrang < 40 && s.ap >= 2) E.lamHanhDong(s, "san", "ban", null, NOW);
        else if (s.ap >= 3) E.lamHanhDong(s, "truong", "tuhoc", E.monYeuNhat(s), NOW);
        else if (s.ap >= 2) E.lamHanhDong(s, "truong", "nghe", E.monYeuNhat(s), NOW);
        else break;
      } else if (kieu === "trungbinh") {
        if (s.tamTrang < 35 && s.ap >= 2) E.lamHanhDong(s, "san", "ban", null, NOW);
        else if (s.ap >= 2 && rng() < 0.6) E.lamHanhDong(s, "truong", "nghe", E.monYeuNhat(s), NOW);
        else if (s.ap >= 2) E.lamHanhDong(s, "san", "chay", null, NOW);
        else break;
      } else { // luoi
        if (s.ap >= 3) E.lamHanhDong(s, "san", "bong", null, NOW);
        else if (s.ap >= 1) E.lamHanhDong(s, "nha", "tv", null, NOW);
        else break;
      }
    }
    s.ap = 0;
    E.nguDay(s, NOW);
    if (s.choSuKien) {
      const sk = E.timSuKien(s.choSuKien);
      // chọn phương án hợp lệ đầu tiên
      for (let j = 0; j < sk.lc.length; j++) {
        if (E.chonSuKien(s, sk.id, j).ok) break;
      }
      s.choSuKien = null;
    }
  }
  return { luuBan: s.soLuuBan, xong: !!s.ketThuc, triTue: s.triTue, batVo };
}

{
  const kq = { cham: [], trungbinh: [], luoi: [] };
  for (let i = 0; i < 300; i++) {
    for (const k of Object.keys(kq)) kq[k].push(moPhong(k, 1000 + i));
  }
  const tb = a => a.reduce((x, y) => x + y, 0) / a.length;
  const tyLe = arr => (arr.filter(r => r.luuBan > 0).length / arr.length * 100);

  console.log("\n  Mô phỏng 300 lượt mỗi kiểu chơi (tới hết lớp 2):");
  for (const k of Object.keys(kq)) {
    const a = kq[k];
    console.log(`    ${k.padEnd(10)} lưu ban TB ${tb(a.map(r=>r.luuBan)).toFixed(2)} lần` +
      `  |  tỷ lệ từng lưu ban ${tyLe(a).toFixed(0)}%` +
      `  |  hoàn thành ${(a.filter(r=>r.xong).length/a.length*100).toFixed(0)}%`);
  }

  check("T10.1 người chăm hiếm khi lưu ban (<15%)", tyLe(kq.cham) < 15, tyLe(kq.cham).toFixed(0) + "%");
  check("T10.2 người lười hay lưu ban (>50%)", tyLe(kq.luoi) > 50, tyLe(kq.luoi).toFixed(0) + "%");
  check("T10.3 chăm rõ ràng hơn lười", tyLe(kq.cham) < tyLe(kq.luoi) - 30);
  check("T10.4 không vòng lặp vô hạn", kq.cham.every(r => r.batVo < 200));
  check("T10.5 người chăm hoàn thành được nội dung", kq.cham.filter(r=>r.xong).length / 300 > 0.8);
}

/* ---------- Kết ---------- */
console.log(`\n  ${pass} đạt / ${fail} lỗi\n`);
if (loi.length) { console.log("  LỖI:"); for (const l of loi) console.log("   ✗ " + l); console.log(); }
process.exit(fail ? 1 : 0);
