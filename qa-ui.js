/* Kiểm tra tầng giao diện — bắt lớp lỗi "vẽ đè mỗi giây làm hỏng thao tác".
 * Chạy: node qa-ui.js   (không cần cài gì, tự dựng DOM giả đủ dùng) */
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0; const loi = [];
const check = (t, ok, ct) => ok ? pass++ : (fail++, loi.push(t + (ct ? " → " + ct : "")));

const html = fs.readFileSync(path.join(__dirname, "dong-doi.html"), "utf8");

/* ---------- DOM giả ---------- */
let demTao = 0;
class El {
  constructor(tag) {
    this.tagName = (tag || "div").toUpperCase();
    this.children = []; this.style = { cssText: "" }; this.dataset = {};
    this._text = ""; this._html = ""; this.disabled = false;
    this.options = []; this.value = ""; this.hidden = false;
    this.className = ""; this.id = ""; this.ghiText = 0;
    demTao++;
  }
  get textContent() { return this._text; }
  set textContent(v) { if (this._text !== String(v)) this.ghiText++; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v); this.children = []; this.options = [];
    // Phân tích tối giản: rút mọi thẻ có class thành phần tử con phẳng, kèm
    // data-* và nội dung chữ. Đủ để querySelector của game tìm thấy.
    const re = /<(\w+)([^>]*\bclass="([^"]*)"[^>]*)>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = re.exec(this._html)) !== null) {
      const el = new El(m[1]);
      el.className = m[3];
      const dj = /\bdata-(\w+)="([^"]*)"/g;
      let d;
      while ((d = dj.exec(m[2])) !== null) el.dataset[d[1]] = d[2];
      if (/\bdisabled\b/.test(m[2])) el.disabled = true;
      el._text = m[4].replace(/<[^>]*>/g, "").trim();
      this.children.push(el);
    }
  }
  appendChild(c) { this.children.push(c); if (this.tagName === "SELECT") this.options.push(c); return c; }
  append() { for (const c of arguments) this.appendChild(c); }
  setAttribute(k, v) { this[k] = v; }
  querySelector(s) { return this._tim(s)[0] || null; }
  querySelectorAll(s) { return this._tim(s); }
  _tim(sel) {
    const ra = [];
    const di = n => { for (const c of n.children) { if (c._khop(sel)) ra.push(c); di(c); } };
    di(this); return ra;
  }
  _khop(sel) {
    if (sel.indexOf("#hdList ") === 0) sel = sel.slice(8);
    if (sel.indexOf("[data-j]") >= 0) return this.className.indexOf("lc") >= 0 && this.dataset.j !== undefined;
    const c = sel.replace(/^\./, "").split("[")[0];
    return this.className.split(" ").indexOf(c) >= 0;
  }
  focus() {} remove() {}
}

const kho = {};
const doc = {
  createElement: t => new El(t),
  // Tạo sẵn phần tử cho id lạ: moHop() dựng giao diện bằng chuỗi HTML mà DOM
  // giả không phân tích được, nên game vẫn phải gán được .onclick lên nó.
  getElementById: id => (kho[id] || (kho[id] = Object.assign(new El("div"), { id }))),
  querySelector: s => {
    for (const k in kho) { const r = kho[k].querySelector(s); if (r) return r; }
    return null;
  },
  querySelectorAll: s => {
    let ra = []; for (const k in kho) ra = ra.concat(kho[k].querySelectorAll(s)); return ra;
  },
};
const IDS = ["bia","av","hTen","hPhu","apSo","apBar","ttSo","ttBar","skSo","skBar",
  "manChoi","noiBar","noiTen","noiCb","hdList","nk","lich","lichChu","namCb",
  "dtbCb","monList","csList","swNhanh","ccAp","ccNgay","ccSk","ccXoa","ccGhi",
  "toastKhu","manHop"];
for (const id of IDS) { kho[id] = new El("div"); kho[id].id = id; }
kho.swNhanh.checked = false;

const luu = {};
const sb = {
  document: doc, console,
  localStorage: {
    getItem: k => (k in luu ? luu[k] : null),
    setItem: (k, v) => { luu[k] = String(v); },
    removeItem: k => { delete luu[k]; },
  },
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0,
  Date, Math, JSON, Object, Array, String, Number, Boolean,
  isNaN, parseFloat, parseInt, Set, Map, Function, Error,
};
sb.window = sb;

// Nạp sẵn một bản lưu để game đi thẳng vào màn chơi, không rẽ sang màn tạo nhân vật
luu["dongdoi.v1"] = JSON.stringify({
  v: 1, ten: "Test", gioiTinh: "nam", lop: 1, ngay: 1,
  tuoiCong: 0, moc: Date.now(), mocAp: Date.now(),
  ap: 20, apMax: 20, tamTrang: 70, sucKhoe: 85,
  triTue: 30, theChat: 30, giaoTiep: 30,
  diem: { toan: 4.6, van: 4.6, td: 4.6 },
  hanhKiem: 100, soLuuBan: 0, daThiLai: false, nhanh: true,
  nhatKy: [], ketThuc: null, choSuKien: null, hetNam: null,
});

const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

// Mã game khai báo bằng const/let nên nằm trong phạm vi hàm. Nối ra ngoài bằng
// getter/setter để test đọc và ghi được đúng biến đang chạy, không phải bản sao.
const cauNoi = `
;window.__g = {
  get Engine(){return Engine},
  get S(){return S}, set S(v){S=v},
  get BaiThi(){return BaiThi}, set BaiThi(v){BaiThi=v},
  get noiHienTai(){return noiHienTai}, set noiHienTai(v){noiHienTai=v},
  get monChon(){return monChon}, set monChon(v){monChon=v},
  ve, batDauChoi, vaoThi, traLoi, cauTiep, veCauHoi, nhatKy, chayHanhDong
};`;

const keys = Object.keys(sb);
new Function(...keys, js.replace(/^\s*"use strict";/, "") + cauNoi)(...keys.map(k => sb[k]));

const g = sb.__g;
check("U0.1 nạp được mã game", typeof g.Engine === "object" && typeof g.ve === "function");

g.S = g.Engine.taoNhanVat("Test", "nam", Date.now());
g.S.nhanh = true;
g.batDauChoi();
check("U0.2 vào được màn chơi", kho.manChoi.hidden === false);

/* ---------- U1: thẻ chọn môn phải sống sót qua các nhịp vẽ ---------- */
{
  g.noiHienTai = "truong";
  g.ve();
  const sel1 = doc.getElementById("selMon") || kho.hdList.querySelector(".form-hang");
  const selThat = kho.hdList.children.length ? kho.hdList.children[0].children[1] : null;
  check("U1.1 ở Trường có danh sách chọn môn", !!selThat && selThat.tagName === "SELECT");

  for (let i = 0; i < 30; i++) g.ve();
  const selSau = kho.hdList.children.length ? kho.hdList.children[0].children[1] : null;
  check("U1.2 thẻ chọn môn KHÔNG bị dựng lại qua 30 nhịp", selThat === selSau,
    selThat === selSau ? "" : "bị thay mới mỗi nhịp — danh sách đang mở sẽ đóng");

  const truoc = selThat ? selThat.options.map(o => o.ghiText).join(",") : "";
  for (let i = 0; i < 30; i++) g.ve();
  const sau = selThat ? selThat.options.map(o => o.ghiText).join(",") : "";
  check("U1.3 không ghi đè nhãn khi điểm không đổi", truoc === sau, truoc + " → " + sau);
}

/* ---------- U2: nút hành động giữ nguyên, chỉ đổi trạng thái ---------- */
{
  const n1 = kho.hdList.querySelectorAll(".hd");
  check("U2.0 có nút hành động", n1.length > 0, n1.length);
  for (let i = 0; i < 20; i++) g.ve();
  const n2 = kho.hdList.querySelectorAll(".hd");
  check("U2.1 nút hành động không bị dựng lại", n1.length > 0 && n1[0] === n2[0]);

  g.S.ap = 0; g.ve();
  const hoc = n2.find(b => b.dataset.hd === "tuhoc");
  check("U2.2 hết năng lượng thì khoá nút học", hoc && hoc.disabled === true);
  g.S.ap = 20; g.ve();
  check("U2.3 có năng lượng thì mở khoá lại", hoc && hoc.disabled === false);
}

/* ---------- U3: đổi địa điểm thì PHẢI dựng lại ---------- */
{
  g.noiHienTai = "san"; g.ve();
  const ds = kho.hdList.querySelectorAll(".hd").map(b => b.dataset.hd);
  check("U3.1 hiện đúng hành động của Sân chơi",
    ds.indexOf("bong") >= 0 && ds.indexOf("tuhoc") < 0, ds.join(","));
  g.noiHienTai = "truong"; g.ve();
  const ds2 = kho.hdList.querySelectorAll(".hd").map(b => b.dataset.hd);
  check("U3.2 quay lại Trường thì hiện hành động học", ds2.indexOf("tuhoc") >= 0, ds2.join(","));
}

/* ---------- U4: nhật ký không bị vẽ lại vô cớ ---------- */
{
  g.ve();
  const t1 = demTao;
  for (let i = 0; i < 25; i++) g.ve();
  const khiRanh = demTao - t1;
  g.nhatKy("Một việc mới xảy ra", 0);
  const t2 = demTao;
  g.ve();
  const khiCoViec = demTao - t2;
  check("U4.1 không có việc mới thì không dựng lại gì", khiRanh === 0, khiRanh + " phần tử bị tạo lại");
  check("U4.2 có việc mới thì mới dựng lại", khiCoViec > 0, khiCoViec);
}

/* ---------- U5: ngày thi ---------- */
{
  g.S.ngay = 7; g.noiHienTai = "truong"; g.ve();
  check("U5.1 ngày thi hiện nút vào phòng thi", !!kho.hdList.querySelector(".nut-chinh"));
  check("U5.2 ngày thi thì không còn nút học",
    kho.hdList.querySelectorAll(".hd").length === 0);
  g.S.ngay = 2; g.ve();
  const ds = kho.hdList.querySelectorAll(".hd").map(b => b.dataset.hd);
  check("U5.3 hết ngày thi thì trả lại màn học", ds.indexOf("tuhoc") >= 0);
}

/* ---------- U6: làm trọn một bài thi ---------- */
{
  g.S.ngay = 7; g.S.lop = 2; g.noiHienTai = "truong"; g.ve();
  g.vaoThi("ck");
  check("U6.1 mở được phòng thi", g.BaiThi !== null);
  check("U6.2 đề đủ câu (2 môn × 6)", g.BaiThi && g.BaiThi.de.length === 12,
    g.BaiThi ? g.BaiThi.de.length : "null");

  let dem = 0;
  while (g.BaiThi && dem < 40) {
    dem++;
    const q = g.BaiThi.de[g.BaiThi.i];
    g.traLoi(q.cau.iDung);
    if (g.BaiThi) g.cauTiep();
  }
  check("U6.3 làm hết bài không treo", dem === 12, "đã làm " + dem + " câu");
  check("U6.4 nộp xong có kết quả năm học", !!g.S.hetNam);
  if (g.S.hetNam) {
    const toan = g.S.hetNam.kq.find(x => x.id === "toan");
    check("U6.5 đúng hết thì điểm Toán cao", toan.diem >= 8, toan.diem.toFixed(2));
    check("U6.6 ghi đúng số câu đúng", toan.dung === 6 && toan.tong === 6, toan.dung + "/" + toan.tong);
    check("U6.7 trả lời đúng hết thì lên lớp", g.S.hetNam.dat === true);
  }
}

/* ---------- U7: sai hết thì trượt ---------- */
{
  g.S.hetNam = null; g.S.ngay = 7;
  g.vaoThi("ck");
  let dem = 0;
  while (g.BaiThi && dem < 40) {
    dem++;
    const q = g.BaiThi.de[g.BaiThi.i];
    const sai = [0, 1, 2, 3].filter(j => j !== q.cau.iDung)[0];
    g.traLoi(sai);
    if (g.BaiThi) g.cauTiep();
  }
  check("U7.1 sai hết thì không đạt", g.S.hetNam && g.S.hetNam.dat === false);
  check("U7.2 trượt lần đầu được cho thi lại", g.S.hetNam && g.S.hetNam.choThiLai === true);
}

/* ---------- U8: trợ giúp 50:50 ---------- */
{
  g.S.hetNam = null; g.S.ngay = 7; g.S.daThiLai = false;
  for (const m of g.Engine.MON) g.S.diem[m.id] = 9;
  g.vaoThi("ck");
  const mon = g.BaiThi.de[0].mon.id;
  const truoc = g.BaiThi.troGiup[mon];
  check("U8.1 học kỹ thì có lượt trợ giúp", truoc > 0, truoc);

  // game gán onclick qua getElementById("btTro"), nên lấy đúng phần tử đó
  const bt = doc.getElementById("btTro");
  check("U8.2 có nút trợ giúp khi còn lượt", typeof bt.onclick === "function");
  if (typeof bt.onclick === "function") {
    bt.onclick();
    check("U8.3 bấm trợ giúp thì trừ lượt", g.BaiThi.troGiup[mon] === truoc - 1,
      truoc + " → " + g.BaiThi.troGiup[mon]);
    check("U8.4 bỏ đúng 2 đáp án", !!g.BaiThi.boBot && g.BaiThi.boBot.length === 2);
    check("U8.5 không bao giờ bỏ mất đáp án đúng",
      g.BaiThi.boBot.indexOf(g.BaiThi.de[g.BaiThi.i].cau.iDung) < 0);
  }
  g.BaiThi = null; g.S.hetNam = null;
}

console.log("\n  " + pass + " đạt / " + fail + " lỗi\n");
if (loi.length) { console.log("  LỖI:"); for (const l of loi) console.log("   ✗ " + l); console.log(); }
process.exit(fail ? 1 : 0);
