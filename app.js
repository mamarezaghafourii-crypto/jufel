/* ==========================================================
   ژوفل — مدیریت خرید، بهای تمام‌شده و قیمت‌گذاری سفارش
   ========================================================== */
(function () {
  'use strict';

  // ---------- ذخیره‌سازی محلی ----------
  const KEY = 'golbook.';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) {
      try { localStorage.setItem(KEY + k, JSON.stringify(v)); return true; }
      catch { toast('حافظه‌ی برنامه پر شده؛ چند عکس گل را حذف کن'); return false; }
    },
  };
  const settings = Object.assign({ scriptUrl: '', token: '', markup: 50, round: 10000, shopName: 'ژوفل' }, store.get('settings', {}));
  let orders = store.get('orders', []);
  let prices = store.get('prices', {});   // id -> { p, d }
  let photos = store.get('photos', {});   // id -> dataURL
  let custom = store.get('custom', []);   // گل‌های افزوده
  const ui = Object.assign({ installHint: true }, store.get('ui', {}));
  const saveOrders = () => store.set('orders', orders);
  const savePrices = () => store.set('prices', prices);

  // ---------- ابزار ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toEn = (s) => String(s ?? '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const num = (s) => { const n = Number(toEn(s).replace(/[^\d]/g, '')); return Number.isFinite(n) ? n : 0; };
  const fa = (n) => Math.round(n || 0).toLocaleString('fa-IR');
  const faD = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const jDate = (d, opt) => new Date(d).toLocaleDateString('fa-IR-u-ca-persian', opt || { day: 'numeric', month: 'long' });
  const jMonthKey = (d) => new Date(d).toLocaleDateString('en-US-u-ca-persian', { year: 'numeric', month: 'numeric' });
  function ago(iso) {
    if (!iso) return '';
    const days = Math.round((new Date(todayISO()) - new Date(iso.slice(0, 10))) / 864e5);
    if (days <= 0) return 'امروز';
    if (days === 1) return 'دیروز';
    if (days < 30) return faD(days) + ' روز پیش';
    return jDate(iso);
  }
  function roundPrice(n) {
    const r = Number(settings.round) || 0;
    return r ? Math.ceil(n / r) * r : Math.round(n);
  }

  // ---------- آیکن‌ها ----------
  const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
  const ic = {
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    minus: I('<path d="M5 12h14"/>'),
    back: I('<path d="M9 5l7 7-7 7"/>'),
    close: I('<path d="M6 6l12 12M18 6L6 18"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    list: I('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
    tag: I('<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
    trash: I('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
    copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
    cloud: I('<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12.5 3.5 3.5 0 0 0 6 19z"/><path d="M12 12v6M9 15l3-3 3 3"/>'),
    edit: I('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>'),
    share: I('<path d="M12 3v13M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  };
  const packArt = {
    box: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M10 26h44v28H10z"/><path d="M6 18h52v8H6z"/><path d="M32 18v36"/><path d="M32 18c-6-10-16-8-13-2 2 3 8 3 13 2zM32 18c6-10 16-8 13-2-2 3-8 3-13 2z"/></svg>',
    vase: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M24 8h16M26 8v8c0 4-8 8-8 20 0 10 6 20 14 20s14-10 14-20c0-12-8-16-8-20V8"/><path d="M20 34h24"/></svg>',
    paper: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M8 14l24 44 24-44c-8 4-16 6-24 6S16 18 8 14z"/><path d="M32 20l-6 38M32 20l6 38"/><path d="M26 44h12"/></svg>',
    basket: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M14 28c0-12 8-20 18-20s18 8 18 20"/><path d="M6 28h52l-6 26H12z"/><path d="M20 28l3 26M32 28v26M44 28l-3 26M9 40h46"/></svg>',
  };
  const PACKS = [['box', 'باکس'], ['vase', 'گلدان'], ['paper', 'کاغذ و کرافت'], ['basket', 'سبد']];
  const SUPPLIES = ['اسفنج گل (فوم)', 'ربان', 'کارت پیام', 'سلفون و تور', 'سیم و چسب', 'اسپری و رنگ', 'پیک', 'دستمزد'];
  const MARKUPS = [30, 40, 50, 70, 100];
  const SWATCH = ['#E0607E', '#F4B4C4', '#F58A3A', '#F7D34B', '#8FB3E8', '#9B6BD1', '#FFFFFF', '#6E9A5C'];

  // ---------- گل‌ها ----------
  const allFlowers = () => FLOWERS.concat(custom.map((c) => ({ ...c, cat: 'mine', mine: true })));
  const byId = (id) => allFlowers().find((f) => f.id === id);
  const tintOf = (f) => {
    const col = f.mine ? f.color : f.c[0];
    if (window.isLightColor(col)) return 'color-mix(in srgb, #9CBF86 22%, var(--surface))';
    return `color-mix(in srgb, ${col} 17%, var(--surface))`;
  };
  function art(f) {
    if (!f) return '';
    if (photos[f.id]) return `<img src="${photos[f.id]}" alt="">`;
    return f.mine ? window.customSVG(f.color) : window.flowerSVG(f);
  }
  const priceOf = (id) => prices[id] || null;
  // قیمت هر گل می‌تواند برای «شاخه» یا «بسته» ثبت شده باشد؛ اینجا به واحد خواسته‌شده تبدیل می‌شود
  const unitWord = (per) => (per === 'bunch' ? 'بسته' : 'شاخه');
  function priceFor(p, per, size) {
    if (!p || !p.p) return 0;
    const from = p.per || 'stem';
    if (from === per && (per === 'stem' || (p.size || size) === size)) return p.p;
    const stem = from === 'bunch' ? p.p / (p.size || size || 1) : p.p;
    return Math.round(per === 'bunch' ? stem * size : stem);
  }
  const stemsOf = (x) => (x.per === 'bunch' ? x.qty * (x.size || 1) : x.qty);
  const qtyLabel = (x) => (x.per === 'bunch' ? `${faD(x.qty)} بسته ${faD(x.size)}تایی` : `${faD(x.qty)} شاخه`);
  function rememberPrice(id, p, per = 'stem', size) {
    if (!p) return;
    prices[id] = { p, d: new Date().toISOString(), per, ...(per === 'bunch' ? { size } : {}) };
    savePrices();
  }

  // ---------- پیام ----------
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ==========================================================
  //  صفحه‌های اصلی
  // ==========================================================
  let tab = 'orders';
  let priceQuery = '';
  const dirtyPrices = {};

  function render() {
    const app = $('#app');
    if (tab === 'orders') app.innerHTML = viewOrders();
    else if (tab === 'prices') app.innerHTML = viewPrices();
    else app.innerHTML = viewSettings();
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
    if (tab === 'prices') bindPriceInputs();
    if (tab === 'settings') bindSettings();
  }

  function bunch(o) {
    const ids = o.flowers.slice(0, 3).map((x) => x.fid);
    if (!ids.length) return '<div class="bunch"></div>';
    return `<div class="bunch">${ids.map((id) => { const f = byId(id); return `<span style="--tint:${f ? tintOf(f) : 'var(--surface-2)'};background:var(--tint)">${art(f)}</span>`; }).join('')}</div>`;
  }

  function viewOrders() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    const mk = jMonthKey(new Date());
    const month = orders.filter((o) => jMonthKey(o.createdAt) === mk);
    const mProfit = month.reduce((s, o) => s + o.profit, 0);
    const list = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    let h = `<header class="head"><div><h1>سفارش‌ها</h1><div class="sub">${jDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <button class="icon-btn" data-a="go-settings" aria-label="تنظیمات">${ic.gear}</button></header>`;

    if (isIOS && !standalone && ui.installHint) {
      h += `<div class="hint"><div>برای نصب روی آیفون: در Safari دکمه‌ی <b>Share</b> را بزن و <b>Add to Home Screen</b> را انتخاب کن.</div><button class="x" data-a="hide-hint" aria-label="بستن">×</button></div>`;
    }
    if (!settings.scriptUrl && orders.length) {
      h += `<div class="hint"><div>سفارش‌ها فعلاً فقط روی همین گوشی ذخیره می‌شوند. <button class="link" data-a="go-settings">اتصال به گوگل شیت</button></div></div>`;
    }
    if (!list.length) {
      const f = byId('peony');
      return h + `<div class="empty"><div class="art">${art(f)}</div><h2>هنوز سفارشی ثبت نشده</h2>
        <p>اسم مشتری را بنویس، گل‌ها را انتخاب کن و قیمت نهایی را در چند ثانیه بگیر.</p>
        <button class="btn" data-a="new">${ic.plus} ثبت اولین سفارش</button></div>`;
    }
    if (month.length) {
      h += `<div class="month"><span>${faD(month.length)} سفارش در ${jDate(new Date(), { month: 'long' })}</span><span>سود <b class="num">${fa(mProfit)}</b> تومان</span></div>`;
    }
    h += '<div class="list">' + list.map((o) => {
      const stems = o.flowers.reduce((s, x) => s + stemsOf(x), 0);
      return `<button class="order" data-a="open-order" data-id="${o.id}">${bunch(o)}
        <div style="min-width:0"><div class="who">${esc(o.customer)}</div><div class="meta">${jDate(o.createdAt)}، ${faD(stems)} شاخه</div></div>
        <div class="money"><div class="price num">${fa(o.price)}</div><div class="profit"><i class="dot ${o.synced ? '' : 'pending'}" title="${o.synced ? 'در گوگل شیت ذخیره شده' : 'هنوز به گوگل شیت نرفته'}"></i><span>سود <span class="num">${fa(o.profit)}</span></span></div></div>
      </button>`;
    }).join('') + '</div>';
    return h;
  }

  function viewPrices() {
    const q = priceQuery.trim();
    const fl = allFlowers().filter((f) => !q || f.name.includes(q));
    let h = `<header class="head"><div><h1>قیمت روز</h1><div class="sub">قیمت خرید هر شاخه یا بسته؛ کنار هر گل در انتخاب سفارش نشان داده می‌شود.</div></div>
      ${settings.scriptUrl ? `<button class="icon-btn" data-a="pull-prices" aria-label="دریافت قیمت‌ها از گوگل شیت">${ic.cloud}</button>` : ''}</header>
      <div class="search">${ic.search}<input class="input" id="pq" type="search" placeholder="جستجوی گل" value="${esc(q)}" autocomplete="off"></div>
      <div class="price-list">`;
    h += fl.map((f) => {
      const p = priceOf(f.id);
      const val = dirtyPrices[f.id] ?? (p ? p.p : '');
      const when = p ? ago(p.d) : 'بدون قیمت';
      return `<div class="price-row"><div class="art" style="--tint:${tintOf(f)}">${art(f)}</div>
        <div><div class="nm">${esc(f.name)}</div><div class="dt ${when === 'امروز' ? 'today' : ''}">${when}${p && p.per === 'bunch' ? '، هر بسته ' + faD(p.size) + 'تایی' : ''}</div></div>
        <label class="money-in sm"><span class="sr">قیمت ${esc(f.name)}</span><input class="input num" inputmode="numeric" data-price="${f.id}" value="${val ? fa(val) : ''}" placeholder="—"></label></div>`;
    }).join('');
    h += `</div><div class="sticky-save" id="savePricesWrap" ${Object.keys(dirtyPrices).length ? '' : 'hidden'}><button class="btn" data-a="save-prices">ذخیره‌ی قیمت‌های امروز</button></div>`;
    return h;
  }

  function bindPriceInputs() {
    const pq = $('#pq');
    pq.addEventListener('input', () => {
      priceQuery = pq.value;
      const pos = pq.selectionStart;
      render();
      const n = $('#pq'); n.focus(); n.setSelectionRange(pos, pos);
    });
    document.querySelectorAll('[data-price]').forEach((inp) => bindMoney(inp, (v) => {
      dirtyPrices[inp.dataset.price] = v;
      $('#savePricesWrap').hidden = false;
    }));
  }

  function viewSettings() {
    return `<header class="head"><div><h1>تنظیمات</h1></div><button class="icon-btn" data-a="go-orders" aria-label="بازگشت">${ic.back}</button></header>
    <section class="card"><h2>قیمت‌گذاری</h2><p>درصد سود پیش‌فرض روی بهای تمام‌شده؛ برای هر سفارش جداگانه هم قابل تغییر است.</p>
      <label class="field"><span>درصد سود</span><input class="input num" id="s-markup" inputmode="numeric" value="${faD(settings.markup)}"></label>
      <div class="field"><span>گرد کردن قیمت نهایی (رو به بالا)</span><div class="seg" id="s-round">
        ${[[0, 'بدون'], [1000, '۱ هزار'], [10000, '۱۰ هزار'], [50000, '۵۰ هزار']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${Number(settings.round) === v}">${l}</button>`).join('')}
      </div></div>
      <label class="field" style="margin:0"><span>نام فروشگاه (پایین متن پیام به مشتری)</span><input class="input" id="s-shop" value="${esc(settings.shopName)}" placeholder="اختیاری"></label>
    </section>
    <section class="card"><h2>گوگل شیت</h2><p>آدرس Web App که از Apps Script گرفتی و رمزی که داخل کد گذاشتی. راهنما در فایل README است.</p>
      <label class="field"><span>آدرس Web App</span><input class="input" id="s-url" dir="ltr" value="${esc(settings.scriptUrl)}" placeholder="https://script.google.com/macros/s/.../exec" autocapitalize="off" autocorrect="off"></label>
      <label class="field"><span>رمز اتصال</span><input class="input" id="s-token" dir="ltr" value="${esc(settings.token)}" autocapitalize="off" autocorrect="off"></label>
      <button class="btn ghost block" data-a="test-conn">بررسی اتصال</button>
      <div class="status" id="s-status"></div>
    </section>
    <section class="card"><h2>پشتیبان</h2><p>${faD(orders.length)} سفارش روی این گوشی ذخیره است${orders.some((o) => !o.synced) ? `؛ ${faD(orders.filter((o) => !o.synced).length)} سفارش هنوز به گوگل شیت نرفته` : ''}.</p>
      <button class="btn ghost block" data-a="sync-all">${ic.cloud} ارسال سفارش‌های مانده</button>
    </section>`;
  }

  function bindSettings() {
    const upd = () => {
      settings.markup = Math.min(500, num($('#s-markup').value)) || 0;
      settings.shopName = $('#s-shop').value.trim();
      settings.scriptUrl = $('#s-url').value.trim();
      settings.token = $('#s-token').value.trim();
      store.set('settings', settings);
    };
    ['#s-markup', '#s-shop', '#s-url', '#s-token'].forEach((s) => $(s).addEventListener('change', upd));
    $('#s-round').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      settings.round = Number(b.dataset.v); store.set('settings', settings);
      $('#s-round').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
  }

  // ---------- ورودی مبلغ با جداکننده‌ی هزارگان ----------
  function bindMoney(inp, onChange) {
    inp.addEventListener('input', () => {
      const v = num(inp.value);
      inp.value = v ? fa(v) : '';
      onChange(v);
    });
    inp.addEventListener('focus', () => setTimeout(() => inp.setSelectionRange(inp.value.length, inp.value.length), 0));
  }

  // ==========================================================
  //  ویزارد سفارش
  // ==========================================================
  const STEPS = ['مشتری', 'گل‌ها', 'بسته‌بندی', 'ملزومات', 'قیمت'];
  let draft = null, step = 0, cat = 'all', query = '';

  function newDraft() {
    return { id: uid(), customer: '', phone: '', due: '', note: '', flowers: [], packs: [], supplies: [], markup: settings.markup, createdAt: new Date().toISOString(), synced: false };
  }
  function totals(d = draft) {
    const fl = d.flowers.reduce((s, x) => s + x.qty * x.unit, 0);
    const pk = d.packs.reduce((s, x) => s + x.qty * x.unit, 0);
    const sp = d.supplies.reduce((s, x) => s + x.unit, 0);
    const cost = fl + pk + sp;
    const price = cost ? roundPrice(cost * (1 + d.markup / 100)) : 0;
    return { fl, pk, sp, cost, price, profit: price - cost, stems: d.flowers.reduce((s, x) => s + stemsOf(x), 0) };
  }

  function openWizard(order) {
    draft = order ? JSON.parse(JSON.stringify(order)) : newDraft();
    step = order ? 4 : 0; cat = 'all'; query = '';
    renderWizard();
    $('#wiz').classList.add('open');
    if (!order) setTimeout(() => $('#w-name')?.focus(), 380);
  }
  function closeWizard() {
    $('#wiz').classList.remove('open');
    draft = null;
    render();
  }

  function renderWizard() {
    const w = $('#wiz');
    const title = step === 0 ? (draft.customer ? esc(draft.customer) : 'سفارش تازه') : esc(draft.customer);
    const fillW = (step / (STEPS.length - 1)) * 80;
    w.innerHTML = `<div class="wiz-top"><div class="wiz-bar">
        <button class="icon-btn" data-a="wiz-back" aria-label="${step ? 'مرحله‌ی قبل' : 'بستن'}">${step ? ic.back : ic.close}</button>
        <div class="title">${title}</div>
        <button class="icon-btn" data-a="wiz-close" aria-label="بستن" ${step ? '' : 'style="visibility:hidden"'}>${ic.close}</button></div>
      <nav class="stem" aria-label="مراحل سفارش"><span class="fill" style="width:${fillW}%"></span>
        ${STEPS.map((s, i) => `<button class="bud ${i < step ? 'done' : i === step ? 'now' : ''}" data-a="goto" data-step="${i}" ${i > maxStep() ? 'disabled' : ''} aria-current="${i === step ? 'step' : 'false'}"><i></i>${s}</button>`).join('')}
      </nav></div>
      <div class="wiz-body" id="wbody"><div class="wiz-in">${[stepCustomer, stepFlowers, stepPacks, stepSupplies, stepPrice][step]()}</div></div>
      <div class="wiz-foot"><div class="wiz-foot-in" id="wfoot">${footer()}</div></div>`;
    $('#wbody').scrollTop = 0;
    bindStep();
  }
  const maxStep = () => (draft.customer.trim() ? 4 : 0);

  function footer() {
    const t = totals();
    if (step === 0) return `<button class="btn block" data-a="next" ${draft.customer.trim() ? '' : 'disabled'} id="w-next">انتخاب گل‌ها</button>`;
    if (step === 4) return `<div class="foot-actions"><button class="btn block" data-a="save">${ic.cloud} ${settings.scriptUrl ? 'ذخیره در گوگل شیت' : 'ذخیره‌ی سفارش'}</button></div>`;
    const label = { 1: 'بسته‌بندی', 2: 'ملزومات', 3: 'قیمت‌گذاری' }[step];
    const small = step === 1
      ? (t.stems ? `${faD(draft.flowers.length)} نوع گل، ${faD(t.stems)} شاخه` : 'هنوز گلی انتخاب نشده')
      : 'بهای تمام‌شده تا اینجا';
    return `<div class="sum"><small>${small}</small><b class="num">${fa(t.cost)}</b> <small style="display:inline">تومان</small></div>
      <button class="btn ${step === 3 ? '' : 'dark'}" data-a="next" ${step === 1 && !draft.flowers.length ? 'disabled' : ''}>${step === 3 ? ic.tag : ''}${label}</button>`;
  }
  const refreshFoot = () => { $('#wfoot').innerHTML = footer(); };

  // --- مرحله ۱: مشتری
  function stepCustomer() {
    return `<h2 class="step-title">سفارش برای چه کسی است؟</h2>
      <p class="step-sub">اسم سفارش‌دهنده، نام پروژه در گوگل شیت هم می‌شود.</p>
      <label class="field"><span>اسم سفارش‌دهنده</span><input class="input big" id="w-name" value="${esc(draft.customer)}" placeholder="مثلاً سارا محمدی" autocomplete="off" enterkeyhint="next"></label>
      <label class="field"><span>شماره تماس (اختیاری)</span><input class="input num" id="w-phone" inputmode="tel" dir="ltr" style="text-align:right" value="${esc(draft.phone)}" placeholder="۰۹۱۲..."></label>
      <label class="field"><span>زمان تحویل (اختیاری)</span><input class="input" id="w-due" value="${esc(draft.due)}" placeholder="مثلاً پنجشنبه ساعت ۶ عصر"></label>
      <label class="field"><span>یادداشت (اختیاری)</span><textarea class="input" id="w-note" placeholder="رنگ‌بندی، متن کارت، آدرس…">${esc(draft.note)}</textarea></label>`;
  }

  // --- مرحله ۲: گل‌ها
  function stepFlowers() {
    return `<h2 class="step-title">گل‌ها را انتخاب کن</h2>
      <p class="step-sub">روی هر گل بزن و تعداد را به شاخه یا بسته وارد کن؛ قیمت از آخرین قیمت ثبت‌شده پر می‌شود.</p>
      <div class="search">${ic.search}<input class="input" id="w-q" type="search" placeholder="جستجو: رز، لیلیوم، داوودی…" value="${esc(query)}" autocomplete="off"></div>
      <div class="chips" role="group" aria-label="دسته‌ها">${FLOWER_CATS.filter(([k]) => k !== 'mine' || custom.length).map(([k, l]) => `<button class="chip" data-a="cat" data-cat="${k}" aria-pressed="${cat === k}">${l}</button>`).join('')}</div>
      <div class="grid" id="w-grid">${gridHTML()}</div>`;
  }
  function gridHTML() {
    const q = query.trim();
    let list = allFlowers().filter((f) => (cat === 'all' || f.cat === cat) && (!q || f.name.includes(q)));
    // گل‌های انتخاب‌شده اول نمایش داده می‌شوند
    const chosen = new Set(draft.flowers.map((x) => x.fid));
    list = list.filter((f) => chosen.has(f.id)).concat(list.filter((f) => !chosen.has(f.id)));
    let h = list.map(tileHTML).join('');
    if (!list.length) h += `<div class="none-found">گلی با این اسم پیدا نشد. می‌توانی خودت اضافه‌اش کنی.</div>`;
    h += `<button class="fl add" data-a="add-flower"><div class="art">${ic.plus}</div><div class="name">گل دیگر</div></button>`;
    return h;
  }
  function tileHTML(f) {
    const sel = draft.flowers.find((x) => x.fid === f.id);
    const p = priceOf(f.id);
    return `<button class="fl ${sel ? 'on' : ''}" data-a="pick" data-id="${f.id}">
      <div class="art" style="--tint:${tintOf(f)}">${art(f)}</div>
      ${sel ? `<span class="badge num">${faD(sel.qty)}</span>` : ''}
      <div class="name">${esc(f.name)}</div>
      <div class="pp ${p ? '' : 'none'} num">${p ? fa(p.p) + (p.per === 'bunch' ? ' / بسته' : '') : 'بدون قیمت'}</div></button>`;
  }
  const refreshGrid = () => { const g = $('#w-grid'); if (g) g.innerHTML = gridHTML(); };

  // --- مرحله ۳: بسته‌بندی
  function stepPacks() {
    return `<h2 class="step-title">بسته‌بندی</h2>
      <p class="step-sub">نوع ظرف را انتخاب کن و قیمت خریدش را بنویس. اگر لازم نیست، از این مرحله رد شو.</p>
      <div class="packs">${PACKS.map(([k, l]) => `<button class="pack" data-a="pack" data-k="${k}" aria-pressed="${draft.packs.some((p) => p.type === k)}">${packArt[k]}${l}</button>`).join('')}</div>
      <div class="rows" id="pack-rows">${draft.packs.map(packRow).join('')}</div>
      ${draft.packs.length ? '' : '<div class="skip-note">بدون ظرف هم می‌توانی ادامه بدهی.</div>'}`;
  }
  function packRow(p, i) {
    const l = PACKS.find(([k]) => k === p.type)[1];
    return `<div class="row" data-i="${i}"><div class="rt">${l}</div>
      <button class="rm" data-a="rm-pack" data-i="${i}" aria-label="حذف ${l}">${ic.close}</button>
      <input class="input full" data-f="label" value="${esc(p.label)}" placeholder="توضیح، مثلاً باکس کلاهی مشکی">
      <div class="two"><div class="mini-step"><button data-a="pq" data-d="1" aria-label="بیشتر">+</button><input class="num" inputmode="numeric" data-f="qty" value="${faD(p.qty)}" aria-label="تعداد"><button data-a="pq" data-d="-1" aria-label="کمتر">−</button></div>
      <label class="money-in sm"><span class="sr">قیمت خرید</span><input class="input num" inputmode="numeric" data-f="unit" value="${p.unit ? fa(p.unit) : ''}" placeholder="قیمت خرید"></label></div></div>`;
  }

  // --- مرحله ۴: ملزومات
  function stepSupplies() {
    return `<h2 class="step-title">ملزومات سفارش</h2>
      <p class="step-sub">هر چیزی که برای این سفارش خرج کردی؛ مبلغ کل هر مورد را بنویس.</p>
      <div class="sup-chips">${SUPPLIES.map((s) => `<button class="chip" data-a="sup" data-name="${s}" aria-pressed="${draft.supplies.some((x) => x.name === s)}">${s}</button>`).join('')}
      <button class="chip" data-a="sup-custom">${'+ مورد دیگر'}</button></div>
      <div class="rows" id="sup-rows">${draft.supplies.map(supRow).join('')}</div>`;
  }
  function supRow(s, i) {
    return `<div class="row" data-i="${i}">
      ${s.custom ? `<input class="input" data-f="name" value="${esc(s.name)}" placeholder="نام مورد">` : `<div class="rt">${esc(s.name)}</div>`}
      <button class="rm" data-a="rm-sup" data-i="${i}" aria-label="حذف">${ic.close}</button>
      <label class="money-in sm full"><span class="sr">مبلغ</span><input class="input num" inputmode="numeric" data-f="unit" value="${s.unit ? fa(s.unit) : ''}" placeholder="مبلغ"></label></div>`;
  }

  // --- مرحله ۵: قیمت‌گذاری
  function stepPrice() {
    const t = totals();
    const flLine = draft.flowers.map((x) => `${esc(x.name)} ${qtyLabel(x)}`).join('، ');
    return `<div class="tag-wrap"><div class="tag-hang">
        <svg class="string" viewBox="0 0 120 44" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 2C30 14 48 30 60 40C72 30 90 14 116 2"/></svg>
        <div class="tag"><div class="for">قیمت برای ${esc(draft.customer)}</div>
          <div class="big num" id="p-price">${fa(t.price)}</div><div class="cur">تومان</div>
          <div class="rule"></div><div class="pf">سود شما <span class="num" id="p-profit">${fa(t.profit)}</span> تومان</div></div>
      </div></div>
      <div class="markup"><div class="mh"><span>درصد سود</span><b class="num" id="p-mk">${faD(draft.markup)}٪</b></div>
        <div class="opts">${MARKUPS.map((m) => `<button data-a="mk" data-v="${m}" aria-pressed="${draft.markup === m}" class="num">${faD(m)}٪</button>`).join('')}</div></div>
      <div class="receipt">
        <div class="ln"><span>گل‌ها (${faD(t.stems)} شاخه)</span><b class="num">${fa(t.fl)}</b></div>
        ${flLine ? `<div class="sub-ln">${flLine}</div>` : ''}
        <div class="ln"><span>بسته‌بندی</span><b class="num">${fa(t.pk)}</b></div>
        <div class="ln"><span>ملزومات</span><b class="num">${fa(t.sp)}</b></div>
        <div class="ln total"><span>بهای تمام‌شده</span><b class="num">${fa(t.cost)}</b></div>
        <div class="ln gain"><span>سود (${faD(draft.markup)}٪${settings.round ? '، گرد شده' : ''})</span><b class="num" id="p-gain">${fa(t.profit)}</b></div>
        <div class="ln total"><span>قیمت اعلامی به مشتری</span><b class="num" id="p-final">${fa(t.price)}</b></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn ghost" style="flex:1" data-a="copy-msg">${ic.copy} کپی متن برای مشتری</button></div>`;
  }

  // ---------- اتصال رویدادهای هر مرحله ----------
  function bindStep() {
    if (step === 0) {
      const name = $('#w-name');
      name.addEventListener('input', () => {
        draft.customer = name.value;
        $('#w-next').disabled = !name.value.trim();
        $('.wiz-bar .title').textContent = name.value.trim() || 'سفارش تازه';
      });
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter' && name.value.trim()) go(1); });
      $('#w-phone').addEventListener('input', (e) => { draft.phone = e.target.value; });
      $('#w-due').addEventListener('input', (e) => { draft.due = e.target.value; });
      $('#w-note').addEventListener('input', (e) => { draft.note = e.target.value; });
    }
    if (step === 1) {
      const q = $('#w-q');
      q.addEventListener('input', () => { query = q.value; refreshGrid(); });
    }
    if (step === 2) bindRows('#pack-rows', draft.packs, true);
    if (step === 3) bindRows('#sup-rows', draft.supplies, false);
  }
  function bindRows(sel, arr, hasQty) {
    const wrap = $(sel);
    wrap.querySelectorAll('.row').forEach((row) => {
      const item = arr[Number(row.dataset.i)];
      row.querySelectorAll('[data-f]').forEach((inp) => {
        const f = inp.dataset.f;
        if (f === 'unit') bindMoney(inp, (v) => { item.unit = v; refreshFoot(); });
        else if (f === 'qty') inp.addEventListener('input', () => { item.qty = Math.max(1, num(inp.value) || 1); refreshFoot(); });
        else inp.addEventListener('input', () => { item[f] = inp.value; });
      });
    });
  }

  function go(s) {
    if (s > maxStep()) return;
    step = Math.max(0, Math.min(4, s));
    renderWizard();
  }

  // ==========================================================
  //  باتم‌شیت‌ها
  // ==========================================================
  function openSheet(html, onBind) {
    const sh = $('#sheet');
    sh.innerHTML = '<div class="grab"></div>' + html;
    $('#scrim').classList.add('open');
    sh.classList.add('open');
    if (onBind) onBind(sh);
  }
  function closeSheet() {
    $('#scrim').classList.remove('open');
    $('#sheet').classList.remove('open');
  }

  // --- انتخاب تعداد و قیمت گل
  function flowerSheet(fid) {
    const f = byId(fid);
    const ex = draft.flowers.find((x) => x.fid === fid);
    const p = priceOf(fid);
    const per0 = ex ? ex.per || 'stem' : (p && p.per) || 'stem';
    const size0 = (ex && ex.size) || (p && p.size) || 10;
    const st = { per: per0, size: size0, qty: ex ? ex.qty : per0 === 'bunch' ? 1 : 10, unit: ex ? ex.unit : priceFor(p, per0, size0), auto: !ex };
    const quickHTML = (per) => (per === 'bunch' ? [1, 2, 5, 10] : [5, 10, 20, 50]).map((n) => `<button data-s="add" data-n="${n}" class="num">+${faD(n)}</button>`).join('');
    const html = `<div class="sh-head"><div class="art" style="--tint:${tintOf(f)}">${art(f)}</div>
      <div><h3>${esc(f.name)}</h3>
        <div class="last">${p ? `آخرین قیمت <b class="num">${fa(p.p)}</b> تومان هر ${unitWord(p.per)}${p.per === 'bunch' ? ' ' + faD(p.size) + 'تایی' : ''}، ${ago(p.d)}` : 'هنوز قیمتی برای این گل ثبت نشده'}</div>
        <div class="photo"><button class="link" data-s="photo">${photos[fid] ? 'تعویض عکس' : 'گذاشتن عکس خودت'}</button>${photos[fid] ? '<button class="link danger" data-s="rm-photo">حذف عکس</button>' : ''}${f.mine ? '<button class="link danger" data-s="rm-flower">حذف این گل</button>' : ''}</div>
      </div></div>
      <div class="seg" style="margin-bottom:14px"><button data-s="per" data-v="stem" aria-pressed="${st.per === 'stem'}">شاخه‌ای</button><button data-s="per" data-v="bunch" aria-pressed="${st.per === 'bunch'}">بسته‌ای</button></div>
      <label class="field" id="s-size-wrap" ${st.per === 'bunch' ? '' : 'hidden'}><span>هر بسته چند شاخه است؟</span><input class="input num" id="s-size" inputmode="numeric" value="${faD(st.size)}"></label>
      <div class="field"><span id="s-qty-l">تعداد ${unitWord(st.per)}</span>
        <div class="stepper"><button data-s="inc" aria-label="بیشتر">${ic.plus}</button><input class="num" id="s-qty" inputmode="numeric" value="${faD(st.qty)}" aria-label="تعداد"><button data-s="dec" aria-label="کمتر">${ic.minus}</button></div></div>
      <div class="quick" id="s-quick">${quickHTML(st.per)}</div>
      <label class="field"><span id="s-unit-l">قیمت خرید هر ${unitWord(st.per)}</span><div class="money-in"><input class="input num" id="s-unit" inputmode="numeric" value="${st.unit ? fa(st.unit) : ''}" placeholder="مثلاً ۸۵٬۰۰۰"></div></label>
      <div class="line-total"><span>جمع این گل <small id="s-stems" style="color:var(--ink-3)">${st.per === 'bunch' ? '(' + faD(st.qty * st.size) + ' شاخه)' : ''}</small></span><span><b class="num" id="s-sum">${fa(st.qty * st.unit)}</b> تومان</span></div>
      <div class="sh-actions">${ex ? `<button class="btn ghost" data-s="remove" aria-label="حذف از سفارش">${ic.trash}</button>` : ''}
        <button class="btn" data-s="ok">${ex ? 'به‌روزرسانی' : 'افزودن به سفارش'}</button></div>
      <input type="file" accept="image/*" id="s-file" hidden>`;
    openSheet(html, (sh) => {
      const qty = $('#s-qty', sh), unit = $('#s-unit', sh), sum = $('#s-sum', sh);
      const stems = $('#s-stems', sh), sizeIn = $('#s-size', sh);
      const tot = () => { sum.textContent = fa(st.qty * st.unit); stems.textContent = st.per === 'bunch' ? '(' + faD(st.qty * st.size) + ' شاخه)' : ''; };
      const upd = () => { qty.value = faD(st.qty); tot(); };
      const setUnit = (v) => { st.unit = v; unit.value = v ? fa(v) : ''; tot(); };
      qty.addEventListener('input', () => { st.qty = num(qty.value); tot(); });
      qty.addEventListener('blur', () => { st.qty = Math.max(1, st.qty); upd(); });
      bindMoney(unit, (v) => { st.unit = v; st.auto = false; tot(); });
      sizeIn.addEventListener('input', () => {
        st.size = Math.max(1, num(sizeIn.value) || 1);
        if (st.auto) setUnit(priceFor(p, 'bunch', st.size)); else tot();
      });
      sh.onclick = (e) => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        const a = b.dataset.s;
        if (a === 'per') {
          const v = b.dataset.v; if (v === st.per) return;
          const u = st.auto && p ? priceFor(p, v, st.size) : v === 'bunch' ? st.unit * st.size : Math.round(st.unit / st.size);
          st.qty = v === 'bunch' ? Math.max(1, Math.round(st.qty / st.size)) : st.qty * st.size;
          st.per = v;
          sh.querySelectorAll('[data-s="per"]').forEach((x) => x.setAttribute('aria-pressed', x === b));
          $('#s-size-wrap', sh).hidden = v !== 'bunch';
          $('#s-qty-l', sh).textContent = 'تعداد ' + unitWord(v);
          $('#s-unit-l', sh).textContent = 'قیمت خرید هر ' + unitWord(v);
          $('#s-quick', sh).innerHTML = quickHTML(v);
          qty.value = faD(st.qty); setUnit(u);
        }
        else if (a === 'inc') { st.qty++; upd(); }
        else if (a === 'dec') { st.qty = Math.max(1, st.qty - 1); upd(); }
        else if (a === 'add') { st.qty += Number(b.dataset.n); upd(); }
        else if (a === 'ok') {
          st.qty = Math.max(1, st.qty);
          if (!st.unit) { unit.focus(); toast('قیمت خرید هر ' + unitWord(st.per) + ' را بنویس'); return; }
          const item = { fid, name: f.name, qty: st.qty, unit: st.unit, per: st.per, ...(st.per === 'bunch' ? { size: st.size } : {}) };
          const i = draft.flowers.findIndex((x) => x.fid === fid);
          if (i >= 0) draft.flowers[i] = item; else draft.flowers.push(item);
          rememberPrice(fid, st.unit, st.per, st.size);
          closeSheet(); refreshGrid(); refreshFoot();
        } else if (a === 'remove') {
          draft.flowers = draft.flowers.filter((x) => x.fid !== fid);
          closeSheet(); refreshGrid(); refreshFoot();
        } else if (a === 'photo') $('#s-file', sh).click();
        else if (a === 'rm-photo') { delete photos[fid]; store.set('photos', photos); closeSheet(); refreshGrid(); }
        else if (a === 'rm-flower') {
          if (!confirm('این گل از فهرست حذف شود؟')) return;
          custom = custom.filter((c) => c.id !== fid); store.set('custom', custom);
          draft.flowers = draft.flowers.filter((x) => x.fid !== fid);
          closeSheet(); renderWizard();
        }
      };
      $('#s-file', sh).addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          photos[fid] = await shrink(file, 360);
          if (store.set('photos', photos)) { toast('عکس گذاشته شد'); closeSheet(); refreshGrid(); }
          else delete photos[fid];
        } catch { toast('این عکس باز نشد؛ یک عکس دیگر انتخاب کن'); }
      });
    });
  }

  function shrink(file, size) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(img.width, img.height);
        const c = document.createElement('canvas'); c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(img.src);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }

  // --- افزودن گل تازه به فهرست
  function addFlowerSheet() {
    let color = SWATCH[0];
    const html = `<h3 style="margin:0 0 14px;font-size:21px;font-weight:850">افزودن گل به فهرست</h3>
      <label class="field"><span>اسم گل</span><input class="input" id="n-name" value="${esc(query)}" placeholder="مثلاً رز آبی" autocomplete="off"></label>
      <div class="field"><span>رنگ تصویر</span><div class="swatches">${SWATCH.map((c, i) => `<button data-c="${c}" style="background:${c}" aria-label="رنگ" aria-pressed="${i === 0}"></button>`).join('')}</div></div>
      <button class="btn block" id="n-ok">افزودن</button>`;
    openSheet(html, (sh) => {
      sh.onclick = (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        color = b.dataset.c;
        sh.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      };
      $('#n-ok', sh).addEventListener('click', () => {
        const name = $('#n-name', sh).value.trim();
        if (!name) { $('#n-name', sh).focus(); return; }
        const f = { id: 'my-' + uid(), name, color };
        custom.push(f); store.set('custom', custom);
        query = ''; cat = 'mine';
        closeSheet(); renderWizard();
        setTimeout(() => flowerSheet(f.id), 350);
      });
      setTimeout(() => $('#n-name', sh).focus(), 350);
    });
  }

  // --- جزئیات سفارش ثبت‌شده
  function orderSheet(id) {
    const o = orders.find((x) => x.id === id); if (!o) return;
    const t = totals(o);
    const items = [
      ...o.flowers.map((x) => [`${x.name}، ${qtyLabel(x)}`, fa(x.qty * x.unit)]),
      ...o.packs.map((x) => [`${PACKS.find(([k]) => k === x.type)[1]}${x.label ? ' (' + x.label + ')' : ''}${x.qty > 1 ? ' ×' + faD(x.qty) : ''}`, fa(x.qty * x.unit)]),
      ...o.supplies.map((x) => [x.name, fa(x.unit)]),
    ];
    const html = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">
        <div><h3 style="margin:0;font-size:22px;font-weight:850">${esc(o.customer)}</h3><div style="color:var(--ink-2);font-size:14px">${jDate(o.createdAt, { weekday: 'long', day: 'numeric', month: 'long' })}${o.due ? '، تحویل: ' + esc(o.due) : ''}</div></div>
        <span class="pill ${o.synced ? '' : 'pending'}"><i class="dot ${o.synced ? '' : 'pending'}"></i>${o.synced ? 'در گوگل شیت' : 'فقط روی گوشی'}</span></div>
      ${o.phone ? `<div style="font-size:14px;margin-bottom:4px"><a class="link" href="tel:${esc(toEn(o.phone))}">${esc(o.phone)}</a></div>` : ''}
      ${o.note ? `<p style="font-size:14px;color:var(--ink-2);margin:4px 0 8px">${esc(o.note)}</p>` : ''}
      <div class="detail-items">${items.map(([a, b]) => `<div class="it"><span>${esc(a)}</span><span class="num">${b}</span></div>`).join('')}</div>
      <div class="receipt" style="box-shadow:none;background:var(--surface-2);margin-bottom:16px">
        <div class="ln"><span>بهای تمام‌شده</span><b class="num">${fa(t.cost)}</b></div>
        <div class="ln gain"><span>سود ${faD(o.markup)}٪</span><b class="num">${fa(o.profit)}</b></div>
        <div class="ln total"><span>قیمت اعلامی</span><b class="num">${fa(o.price)}</b></div></div>
      <div class="foot-actions">
        ${o.synced ? '' : `<button class="btn" data-s="sync">${ic.cloud} ارسال به گوگل شیت</button>`}
        <div style="display:flex;gap:10px"><button class="btn ghost" style="flex:1" data-s="edit">${ic.edit} ویرایش</button><button class="btn ghost" style="flex:1" data-s="copy">${ic.copy} متن مشتری</button></div>
        <button class="btn ghost danger" data-s="del">${ic.trash} حذف سفارش</button></div>`;
    openSheet(html, (sh) => {
      sh.onclick = async (e) => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        const a = b.dataset.s;
        if (a === 'edit') { closeSheet(); setTimeout(() => openWizard(o), 200); }
        else if (a === 'copy') copyMsg(o);
        else if (a === 'sync') { b.disabled = true; await syncOrder(o, true); closeSheet(); render(); }
        else if (a === 'del') {
          if (!confirm(`سفارش «${o.customer}» حذف شود؟ (از گوگل شیت پاک نمی‌شود)`)) return;
          orders = orders.filter((x) => x.id !== o.id); saveOrders(); closeSheet(); render(); toast('سفارش حذف شد');
        }
      };
    });
  }

  // ---------- متن مشتری ----------
  function customerText(o) {
    const lines = [`سلام ${o.customer} عزیز 🌸`, '', 'جزئیات سفارش شما:'];
    o.flowers.forEach((x) => lines.push(`• ${x.name}: ${faD(stemsOf(x))} شاخه`));
    o.packs.forEach((x) => lines.push(`• ${PACKS.find(([k]) => k === x.type)[1]}${x.label ? ' ' + x.label : ''}`));
    lines.push('', `مبلغ نهایی: ${fa(o.price)} تومان`);
    if (settings.shopName) lines.push('', settings.shopName);
    return lines.join('\n');
  }
  async function copyMsg(o) {
    const text = customerText(o);
    try { await navigator.clipboard.writeText(text); toast('متن کپی شد؛ در دایرکت یا واتس‌اپ بچسبان'); }
    catch {
      if (navigator.share) navigator.share({ text }).catch(() => {});
      else toast('کپی نشد');
    }
  }

  // ==========================================================
  //  گوگل شیت
  // ==========================================================
  async function api(action, payload) {
    if (!settings.scriptUrl) throw new Error('no-url');
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(settings.scriptUrl, {
        method: 'POST', redirect: 'follow', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },  // بدون preflight
        body: JSON.stringify({ action, token: settings.token, ...payload }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      return j;
    } finally { clearTimeout(to); }
  }
  function orderPayload(o) {
    const t = totals(o);
    return {
      id: o.id, customer: o.customer.trim(), phone: o.phone, due: o.due, note: o.note,
      date: jDate(o.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' }),
      createdAt: o.createdAt, markup: o.markup,
      flowers: o.flowers.map((x) => (x.per === 'bunch' ? { name: `${x.name} (بسته ${faD(x.size)}تایی)`, qty: x.qty, unit: x.unit } : { id: x.fid, name: x.name, qty: x.qty, unit: x.unit })),
      packs: o.packs.map((x) => ({ name: PACKS.find(([k]) => k === x.type)[1] + (x.label ? ' - ' + x.label : ''), qty: x.qty, unit: x.unit })),
      supplies: o.supplies.map((x) => ({ name: x.name || 'مورد دیگر', qty: 1, unit: x.unit })),
      totals: { flowers: t.fl, packs: t.pk, supplies: t.sp, cost: t.cost, profit: o.profit, price: o.price },
    };
  }
  async function syncOrder(o, loud) {
    try {
      await api('saveOrder', { order: orderPayload(o) });
      o.synced = true; saveOrders();
      if (loud) toast('در گوگل شیت ذخیره شد');
      return true;
    } catch (e) {
      o.synced = false; saveOrders();
      if (loud) toast(e.message === 'no-url' ? 'اول آدرس گوگل شیت را در تنظیمات وارد کن' : e.message === 'bad-token' ? 'رمز اتصال اشتباه است' : 'اتصال به گوگل شیت برقرار نشد؛ سفارش روی گوشی ذخیره ماند');
      return false;
    }
  }
  async function syncPending(loud) {
    const pend = orders.filter((o) => !o.synced);
    if (!pend.length) { if (loud) toast('همه‌ی سفارش‌ها در گوگل شیت هستند'); return; }
    let ok = 0;
    for (const o of pend) if (await syncOrder(o, false)) ok++;
    if (loud) toast(ok === pend.length ? `${faD(ok)} سفارش ارسال شد` : `${faD(ok)} از ${faD(pend.length)} سفارش ارسال شد؛ بقیه بعداً`);
    render();
  }
  async function pullPrices(loud) {
    try {
      const j = await api('getPrices', {});
      let n = 0;
      (j.prices || []).forEach((row) => {
        const f = allFlowers().find((x) => x.id === row.id || x.name === row.name);
        if (!f || !row.price) return;
        const cur = prices[f.id];
        if (!cur || (row.date && row.date > cur.d)) { prices[f.id] = { p: Number(row.price), d: row.date || new Date().toISOString() }; n++; }
      });
      savePrices();
      if (loud) toast(n ? `${faD(n)} قیمت به‌روز شد` : 'قیمت‌ها به‌روز هستند');
      if (tab === 'prices') render();
    } catch (e) { if (loud) toast('دریافت قیمت‌ها از گوگل شیت انجام نشد'); }
  }

  // ==========================================================
  //  رویدادها
  // ==========================================================
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    switch (a) {
      case 'new': openWizard(); break;
      case 'tab': tab = b.dataset.tab; render(); window.scrollTo(0, 0); break;
      case 'go-settings': tab = 'settings'; render(); window.scrollTo(0, 0); break;
      case 'go-orders': tab = 'orders'; render(); break;
      case 'hide-hint': ui.installHint = false; store.set('ui', ui); render(); break;
      case 'open-order': orderSheet(b.dataset.id); break;
      case 'wiz-close':
        if (draft && (draft.flowers.length || draft.customer) && !orders.some((o) => o.id === draft.id) && !confirm('سفارش ذخیره نشده؛ بسته شود؟')) return;
        closeWizard(); break;
      case 'wiz-back': if (step === 0) { $('[data-a="wiz-close"]').click(); } else go(step - 1); break;
      case 'goto': go(Number(b.dataset.step)); break;
      case 'next': go(step + 1); break;
      case 'cat': cat = b.dataset.cat; document.querySelectorAll('[data-a="cat"]').forEach((x) => x.setAttribute('aria-pressed', x === b)); refreshGrid(); break;
      case 'pick': flowerSheet(b.dataset.id); break;
      case 'add-flower': addFlowerSheet(); break;
      case 'pack': {
        const k = b.dataset.k, i = draft.packs.findIndex((p) => p.type === k);
        if (i >= 0) draft.packs.splice(i, 1); else draft.packs.push({ type: k, label: '', qty: 1, unit: 0 });
        renderWizard();
        if (i < 0) setTimeout(() => { const rows = document.querySelectorAll('#pack-rows .row'); rows[rows.length - 1]?.querySelector('[data-f="unit"]').focus(); }, 60);
        break;
      }
      case 'rm-pack': draft.packs.splice(Number(b.dataset.i), 1); renderWizard(); break;
      case 'pq': {
        const row = b.closest('.row'), item = draft.packs[Number(row.dataset.i)];
        item.qty = Math.max(1, item.qty + Number(b.dataset.d));
        row.querySelector('[data-f="qty"]').value = faD(item.qty); refreshFoot(); break;
      }
      case 'sup': {
        const n = b.dataset.name, i = draft.supplies.findIndex((s) => s.name === n && !s.custom);
        if (i >= 0) draft.supplies.splice(i, 1); else draft.supplies.push({ name: n, unit: 0 });
        renderWizard();
        if (i < 0) setTimeout(() => { const rows = document.querySelectorAll('#sup-rows .row'); rows[rows.length - 1]?.querySelector('[data-f="unit"]').focus(); }, 60);
        break;
      }
      case 'sup-custom':
        draft.supplies.push({ name: '', unit: 0, custom: true }); renderWizard();
        setTimeout(() => { const rows = document.querySelectorAll('#sup-rows .row'); rows[rows.length - 1]?.querySelector('[data-f="name"]').focus(); }, 60);
        break;
      case 'rm-sup': draft.supplies.splice(Number(b.dataset.i), 1); renderWizard(); break;
      case 'mk': {
        draft.markup = Number(b.dataset.v);
        const t = totals();
        document.querySelectorAll('[data-a="mk"]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        $('#p-mk').textContent = faD(draft.markup) + '٪';
        ['#p-price', '#p-final'].forEach((s) => { $(s).textContent = fa(t.price); });
        ['#p-profit', '#p-gain'].forEach((s) => { $(s).textContent = fa(t.profit); });
        $('.ln.gain span').textContent = `سود (${faD(draft.markup)}٪${settings.round ? '، گرد شده' : ''})`;
        break;
      }
      case 'copy-msg': { const t = totals(); copyMsg({ ...draft, price: t.price }); break; }
      case 'save': {
        if (!draft.flowers.length) { go(1); toast('حداقل یک گل انتخاب کن'); return; }
        const t = totals();
        draft.customer = draft.customer.trim();
        draft.supplies = draft.supplies.filter((s) => s.unit || s.name);
        Object.assign(draft, { cost: t.cost, price: t.price, profit: t.profit, synced: false, updatedAt: new Date().toISOString() });
        const i = orders.findIndex((o) => o.id === draft.id);
        if (i >= 0) orders[i] = draft; else orders.push(draft);
        saveOrders();
        const saved = draft;
        b.disabled = true;
        if (settings.scriptUrl) await syncOrder(saved, true); else toast('سفارش ذخیره شد');
        closeWizard();
        break;
      }
      case 'save-prices': {
        const list = Object.entries(dirtyPrices).filter(([, v]) => v);
        list.forEach(([id, v]) => rememberPrice(id, v, (prices[id] && prices[id].per) || 'stem', prices[id] && prices[id].size));
        Object.keys(dirtyPrices).forEach((k) => delete dirtyPrices[k]);
        render();
        toast(`${faD(list.length)} قیمت ذخیره شد`);
        if (settings.scriptUrl && list.length) {
          api('savePrices', { prices: list.map(([id, v]) => ({ id, name: byId(id)?.name || id, price: v, date: new Date().toISOString() })) })
            .catch(() => toast('قیمت‌ها روی گوشی ذخیره شد، ولی به گوگل شیت نرسید'));
        }
        break;
      }
      case 'pull-prices': pullPrices(true); break;
      case 'test-conn': {
        const st = $('#s-status');
        st.innerHTML = 'در حال بررسی…';
        settings.scriptUrl = $('#s-url').value.trim(); settings.token = $('#s-token').value.trim(); store.set('settings', settings);
        try { await api('ping', {}); st.innerHTML = '<i class="dot"></i> اتصال برقرار است'; pullPrices(false); }
        catch (err) { st.innerHTML = `<i class="dot pending"></i> ${err.message === 'bad-token' ? 'رمز اتصال با کد Apps Script یکی نیست' : err.message === 'no-url' ? 'آدرس Web App را وارد کن' : 'وصل نشد؛ آدرس و دسترسی Anyone را بررسی کن'}`; }
        break;
      }
      case 'sync-all': syncPending(true); break;
    }
  });
  $('#scrim').addEventListener('click', closeSheet);

  // کشیدن باتم‌شیت به پایین برای بستن
  (function dragToClose() {
    const sh = $('#sheet'); let y0 = null, dy = 0;
    sh.addEventListener('touchstart', (e) => { if (sh.scrollTop > 0 || e.target.closest('input,textarea')) return; y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; }, { passive: true });
    sh.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sh.addEventListener('touchend', () => { if (y0 == null) return; sh.style.transition = ''; sh.style.transform = ''; if (dy > 110) closeSheet(); y0 = null; });
  })();

  // ---------- شروع ----------
  render();
  if (settings.scriptUrl) { syncPending(false); pullPrices(false); }
  window.addEventListener('online', () => settings.scriptUrl && syncPending(false));
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
