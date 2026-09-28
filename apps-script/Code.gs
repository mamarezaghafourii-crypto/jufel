/**
 * دفتر گل — اتصال به گوگل شیت
 * ------------------------------------------------------------
 * ۱. در گوگل شیت: Extensions ← Apps Script و این کد را جایگزین کن.
 * ۲. مقدار TOKEN را به یک رمز دلخواه تغییر بده (همان را در تنظیمات برنامه بنویس).
 * ۳. یک بار تابع setup را Run کن تا برگه‌ها ساخته شوند.
 * ۴. Deploy ← New deployment ← Web app
 *      Execute as: Me   |   Who has access: Anyone
 *    آدرس Web App را در تنظیمات برنامه بچسبان.
 */

const TOKEN = 'rose-1405';           // ← حتماً عوضش کن
const ORDERS = 'سفارش‌ها';
const PRICES = 'قیمت روز';

const ORDER_HEAD = ['شناسه', 'تاریخ', 'سفارش‌دهنده', 'تلفن', 'زمان تحویل', 'هزینه گل', 'بسته‌بندی', 'ملزومات',
  'بهای تمام‌شده', 'درصد سود', 'سود', 'قیمت اعلامی', 'برگه پروژه', 'یادداشت', 'آخرین به‌روزرسانی'];
const PRICE_HEAD = ['شناسه', 'گل', 'قیمت خرید هر شاخه (تومان)', 'تاریخ به‌روزرسانی'];

// ---------------------------------------------------------------
function doGet() {
  return json({ ok: true, msg: 'دفتر گل وصل است' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad-json' }); }
  if (body.token !== TOKEN) return json({ ok: false, error: 'bad-token' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case 'ping': return json({ ok: true });
      case 'saveOrder': return json(saveOrder(body.order));
      case 'getPrices': return json({ ok: true, prices: getPrices() });
      case 'savePrices': upsertPrices(body.prices || []); return json({ ok: true });
      default: return json({ ok: false, error: 'unknown-action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------
//  راه‌اندازی اولیه: ساخت برگه‌ها و فهرست گل‌ها
// ---------------------------------------------------------------
function setup() {
  ordersSheet_();
  const sh = pricesSheet_();
  if (sh.getLastRow() < 2) {
    const rows = FLOWER_LIST.map(([id, name]) => [id, name, '', '']);
    sh.getRange(2, 1, rows.length, 4).setValues(rows);
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('برگه‌ها آماده‌اند');
}

function ordersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ORDERS);
  if (!sh) {
    sh = ss.insertSheet(ORDERS, 0);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, ORDER_HEAD.length).setValues([ORDER_HEAD])
      .setFontWeight('bold').setBackground('#2B1A2F').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.hideColumns(1);
    sh.getRange('F:L').setNumberFormat('#,##0');
    sh.setColumnWidth(3, 160); sh.setColumnWidth(13, 170); sh.setColumnWidth(14, 220);
  }
  return sh;
}

function pricesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PRICES);
  if (!sh) {
    sh = ss.insertSheet(PRICES, 1);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, PRICE_HEAD.length).setValues([PRICE_HEAD])
      .setFontWeight('bold').setBackground('#2E6A45').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.hideColumns(1);
    sh.getRange('C:C').setNumberFormat('#,##0');
    sh.getRange('D:D').setNumberFormat('yyyy/mm/dd hh:mm');
    sh.setColumnWidth(2, 200); sh.setColumnWidth(3, 190); sh.setColumnWidth(4, 160);
  }
  return sh;
}

// ---------------------------------------------------------------
//  ذخیره‌ی سفارش: یک ردیف در «سفارش‌ها» + یک برگه‌ی جدا به اسم مشتری
// ---------------------------------------------------------------
function saveOrder(o) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sum = ordersSheet_();
  const ids = sum.getLastRow() > 1 ? sum.getRange(2, 1, sum.getLastRow() - 1, 1).getValues().map((r) => String(r[0])) : [];
  const idx = ids.indexOf(o.id);
  const rowNum = idx >= 0 ? idx + 2 : sum.getLastRow() + 1;

  // برگه‌ی پروژه
  let sheetName = idx >= 0 ? String(sum.getRange(rowNum, 13).getDisplayValue()) : '';
  let sh = sheetName ? ss.getSheetByName(sheetName) : null;
  if (!sh) {
    sheetName = uniqueName_(ss, clean_(o.customer + ' ' + String(o.date).replace(/\//g, '-')));
    sh = ss.insertSheet(sheetName);
  }
  writeProject_(sh, o);

  const t = o.totals;
  const link = '=HYPERLINK("#gid=' + sh.getSheetId() + '","' + sheetName.replace(/"/g, '') + '")';
  const row = [o.id, o.date, o.customer, o.phone || '', o.due || '', t.flowers, t.packs, t.supplies,
    t.cost, o.markup / 100, t.profit, t.price, link, o.note || '', new Date()];
  sum.getRange(rowNum, 1, 1, row.length).setValues([row]);
  sum.getRange(rowNum, 10).setNumberFormat('0%');
  sum.getRange(rowNum, 15).setNumberFormat('yyyy/mm/dd hh:mm');

  // قیمت خرید گل‌های این سفارش، قیمت روز هم می‌شود
  upsertPrices((o.flowers || []).filter((f) => f.id).map((f) => ({ id: f.id, name: f.name, price: f.unit, date: o.createdAt })));
  return { ok: true, sheet: sheetName };
}

function writeProject_(sh, o) {
  sh.clear();
  sh.setRightToLeft(true);
  const t = o.totals;
  sh.getRange('A1').setValue(o.customer).setFontSize(18).setFontWeight('bold');
  const info = [['تاریخ', o.date], ['تلفن', o.phone || ''], ['زمان تحویل', o.due || ''], ['یادداشت', o.note || '']];
  sh.getRange(2, 1, info.length, 2).setValues(info);
  sh.getRange(2, 1, info.length, 1).setFontColor('#6F5B72');

  const start = 7;
  const head = [['بخش', 'آیتم', 'تعداد', 'قیمت خرید واحد', 'جمع']];
  sh.getRange(start, 1, 1, 5).setValues(head).setFontWeight('bold').setBackground('#F7DDE8');
  const rows = [];
  (o.flowers || []).forEach((x) => rows.push(['گل', x.name, x.qty, x.unit, x.qty * x.unit]));
  (o.packs || []).forEach((x) => rows.push(['بسته‌بندی', x.name, x.qty, x.unit, x.qty * x.unit]));
  (o.supplies || []).forEach((x) => rows.push(['ملزومات', x.name, x.qty, x.unit, x.qty * x.unit]));
  if (rows.length) sh.getRange(start + 1, 1, rows.length, 5).setValues(rows);

  let r = start + rows.length + 2;
  const tot = [
    ['', 'جمع گل‌ها', '', '', t.flowers],
    ['', 'جمع بسته‌بندی', '', '', t.packs],
    ['', 'جمع ملزومات', '', '', t.supplies],
    ['', 'بهای تمام‌شده', '', '', t.cost],
    ['', 'سود (' + o.markup + '٪)', '', '', t.profit],
    ['', 'قیمت اعلامی به مشتری', '', '', t.price],
  ];
  sh.getRange(r, 1, tot.length, 5).setValues(tot);
  sh.getRange(r + 3, 2, 1, 4).setFontWeight('bold');
  sh.getRange(r + 4, 2, 1, 4).setFontColor('#2E6A45').setFontWeight('bold');
  sh.getRange(r + 5, 1, 1, 5).setFontWeight('bold').setFontSize(13).setBackground('#DCC29A');
  sh.getRange(start + 1, 3, rows.length + tot.length + 2, 3).setNumberFormat('#,##0');
  sh.setColumnWidth(1, 90); sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 70); sh.setColumnWidth(4, 130); sh.setColumnWidth(5, 130);
}

function clean_(s) {
  return String(s).replace(/[\[\]\*\?\/\\:']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'سفارش';
}
function uniqueName_(ss, base) {
  let name = base, i = 2;
  while (ss.getSheetByName(name)) name = base + ' (' + i++ + ')';
  return name;
}

// ---------------------------------------------------------------
//  قیمت روز
// ---------------------------------------------------------------
function getPrices() {
  const sh = pricesSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter((r) => r[2] !== '' && Number(r[2]) > 0)
    .map((r) => ({
      id: String(r[0]), name: String(r[1]), price: Number(r[2]),
      date: r[3] instanceof Date ? r[3].toISOString() : '',
    }));
}

function upsertPrices(list) {
  if (!list.length) return;
  const sh = pricesSheet_();
  const n = Math.max(0, sh.getLastRow() - 1);
  const data = n ? sh.getRange(2, 1, n, 4).getValues() : [];
  list.forEach((p) => {
    const d = p.date ? new Date(p.date) : new Date();
    const i = data.findIndex((r) => String(r[0]) === p.id || String(r[1]) === p.name);
    if (i >= 0) {
      const old = data[i][3] instanceof Date ? data[i][3] : null;
      if (!old || d >= old) data[i] = [p.id, p.name, Number(p.price), d];
    } else data.push([p.id, p.name, Number(p.price), d]);
  });
  if (data.length) sh.getRange(2, 1, data.length, 4).setValues(data);
}

// وقتی خودت در برگه‌ی «قیمت روز» قیمتی را عوض کنی، تاریخش خودکار امروز می‌شود
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== PRICES || e.range.getRow() < 2 || e.range.getColumn() !== 3) return;
  sh.getRange(e.range.getRow(), 4, e.range.getNumRows(), 1).setValue(new Date());
}

// فهرست گل‌ها (هم‌نام با برنامه)
const FLOWER_LIST = [
  ["rose-holland", "رز هلندی"],
  ["rose-iran", "رز ایرانی"],
  ["rose-white", "رز سفید"],
  ["rose-spray", "رز مینیاتوری (اسپری)"],
  ["peony", "پیونی (گل صدتومانی)"],
  ["lilium", "لیلیوم (لیلی)"],
  ["lilium-orange", "لیلیوم آسیایی"],
  ["tulip", "لاله"],
  ["gerbera", "ژربرا"],
  ["chrys-big", "داوودی درشت"],
  ["chrys-spray", "داوودی مینیاتوری"],
  ["chrys-santini", "داوودی سانتینی (پامپونی)"],
  ["iris", "زنبق"],
  ["orchid-phal", "ارکیده فالانوپسیس"],
  ["orchid-cymb", "ارکیده سیمبیدیوم"],
  ["orchid-dend", "ارکیده دندروبیوم (سنگاپوری)"],
  ["carnation", "میخک (قرنفل)"],
  ["alstroemeria", "آلسترومریا"],
  ["lisianthus", "لیسیانتوس"],
  ["hydrangea", "هورتانسیا (ادریسی)"],
  ["anthurium", "آنتوریوم"],
  ["tuberose", "مریم"],
  ["gladiolus", "گلایل"],
  ["narcissus", "نرگس"],
  ["sunflower", "آفتابگردان"],
  ["calla", "کالا (شیپوری)"],
  ["ranunculus", "رانانکولوس (آلاله)"],
  ["anemone", "آنمون (شقایق هلندی)"],
  ["stock", "ماتیولا (شب‌بو)"],
  ["delphinium", "دلفینیوم"],
  ["strelitzia", "استرلیتزیا (پرنده بهشتی)"],
  ["protea", "پروتئا"],
  ["aster", "مینا (آستر)"],
  ["marguerite", "مارگریت (بابونه)"],
  ["freesia", "فریزیا"],
  ["hyacinth", "سنبل"],
  ["cornflower", "گل گندم"],
  ["lavender", "لوندر (اسطوخودوس)"],
  ["gypsophila", "ژیپسوفیلا (عروس)"],
  ["statice", "استاتیس (لیمونیوم)"],
  ["caspia", "کاسپیا"],
  ["waxflower", "واکس‌فلاور"],
  ["mimosa", "میموزا"],
  ["eucalyptus", "اکالیپتوس"],
  ["ruscus", "رسکوس"],
  ["fern", "سرخس"],
  ["aralia", "برگ آرالیا"],
  ["pittosporum", "پیتوسپوروم"],
  ["cotton", "شاخه پنبه"],
  ["pampas", "پامپاس"],
  ["lagurus", "لاگوروس (دم‌خرگوشی)"]
];
