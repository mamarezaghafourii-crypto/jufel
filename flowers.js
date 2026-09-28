/* =========================================================
   کاتالوگ گل‌های بازار ایران + تصویرسازی SVG اختصاصی هر گل
   هر گل: id, name, cat, shape, c (رنگ‌ها), o (تنظیمات شکل)
   ========================================================= */
(function () {
  const G1 = '#5E8A5A', G2 = '#3F6B45';

  // عدد تصادفیِ ثابت برای هر گل (تا تصویر همیشه یکسان بماند)
  function rng(seed) {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return function () {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = (n, fn) => Array.from({ length: n }, (_, i) => fn(i, (i * 360) / n)).join('');
  const leaf = (x, y, rot, s = 1, col = G1) =>
    `<path d="M0 0C8-7 22-7 30 0C22 7 8 7 0 0Z" fill="${col}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;
  const leaves = () => leaf(46, 78, 150, 1.05, G2) + leaf(54, 78, 30, 1.05, G1);
  const line = 'stroke-linecap="round" fill="none"';

  const S = {
    rose(c, o = {}) {
      const n = o.n || 5;
      return (o.noLeaves ? '' : leaves()) +
        R(n, (i, a) => `<ellipse cx="50" cy="31" rx="17" ry="20" fill="${c[0]}" transform="rotate(${a + 18} 50 50)"/>`) +
        `<circle cx="50" cy="50" r="19" fill="${c[1]}"/>` +
        `<path d="M47 50a3 3 0 1 1 6 0a6 6 0 1 1-12 0a9 9 0 1 1 18 0a12 12 0 1 1-24 0" stroke="${c[2]}" stroke-width="2.4" ${line}/>`;
    },
    sprayRose(c) {
      const one = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-50 -50)">${S.rose(c, { noLeaves: true })}</g>`;
      return leaf(50, 70, 120, 0.9, G2) + leaf(50, 70, 60, 0.9, G1) + leaf(50, 72, 170, .8, G1) +
        one(33, 40, 0.5) + one(67, 42, 0.46) + one(50, 64, 0.52);
    },
    peony(c) {
      return leaves() +
        R(9, (i, a) => `<ellipse cx="50" cy="25" rx="14" ry="18" fill="${c[0]}" stroke="rgba(0,0,0,.07)" transform="rotate(${a} 50 50)"/>`) +
        R(7, (i, a) => `<ellipse cx="50" cy="34" rx="12" ry="14" fill="${c[1]}" stroke="rgba(0,0,0,.06)" transform="rotate(${a + 20} 50 50)"/>`) +
        R(5, (i, a) => `<ellipse cx="50" cy="42" rx="9" ry="10" fill="${c[0]}" stroke="rgba(0,0,0,.06)" transform="rotate(${a + 10} 50 50)"/>`) +
        `<circle cx="50" cy="50" r="6" fill="${c[2]}"/>`;
    },
    lily(c, o = {}) {
      const s = o.scale || 1;
      const petal = 'M50 50C40 38 41 17 50 8C59 17 60 38 50 50Z';
      let out = R(6, (i, a) => `<path d="${petal}" fill="${i % 2 ? c[1] : c[0]}" transform="rotate(${a + 30} 50 50)"/>`);
      out += R(6, (i, a) => o.stripes
        ? `<path d="M50 40L50 26M47 38L46 30M53 38L54 30" stroke="${c[2]}" stroke-width="1.4" ${line} transform="rotate(${a + 30} 50 50)"/>`
        : `<circle cx="49" cy="34" r="1.3" fill="${c[2]}" transform="rotate(${a + 30} 50 50)"/><circle cx="51.5" cy="28" r="1.1" fill="${c[2]}" transform="rotate(${a + 30} 50 50)"/><circle cx="50" cy="40" r="1.2" fill="${c[2]}" transform="rotate(${a + 30} 50 50)"/>`);
      out += R(6, (i, a) => `<path d="M50 50L50 33" stroke="#9BAF7A" stroke-width="1.2" ${line} transform="rotate(${a + 5} 50 50)"/><ellipse cx="50" cy="32" rx="1.6" ry="3.2" fill="${c[3] || '#8A4B2A'}" transform="rotate(${a + 5} 50 50)"/>`);
      return s === 1 ? out : `<g transform="translate(50 50) scale(${s}) translate(-50 -50)">${out}</g>`;
    },
    daisy(c, o = {}) {
      const n = o.n || 16, len = o.len || 22, w = o.w || 4.5, r = o.r || 10;
      let out = '';
      if (o.double) out += R(n, (i, a) => `<ellipse cx="50" cy="${50 - r - len / 2 + 2}" rx="${w}" ry="${len / 2}" fill="${c[1]}" transform="rotate(${a + 180 / n} 50 50)"/>`);
      out += R(n, (i, a) => `<ellipse cx="50" cy="${50 - r - len / 2 + (o.double ? 5 : 2)}" rx="${w}" ry="${len / 2 - (o.double ? 2 : 0)}" fill="${c[0]}" transform="rotate(${a} 50 50)"/>`);
      out += `<circle cx="50" cy="50" r="${r}" fill="${c[2]}"/>`;
      if (r > 7) out += R(Math.round(r * 1.4), (i, a) => `<circle cx="50" cy="${50 - r * 0.6}" r="${r > 14 ? 1.4 : 0.9}" fill="${c[3] || 'rgba(0,0,0,.25)'}" transform="rotate(${a} 50 50)"/>`);
      return out;
    },
    pompon(c) {
      return `<circle cx="50" cy="50" r="31" fill="${c[0]}"/>` +
        R(20, (i, a) => `<ellipse cx="50" cy="26" rx="3.2" ry="6" fill="${c[1]}" transform="rotate(${a} 50 50)"/>`) +
        R(14, (i, a) => `<ellipse cx="50" cy="35" rx="3" ry="5.5" fill="${c[1]}" transform="rotate(${a + 12} 50 50)"/>`) +
        R(8, (i, a) => `<ellipse cx="50" cy="43" rx="2.6" ry="4.5" fill="${c[1]}" transform="rotate(${a + 20} 50 50)"/>`) +
        `<circle cx="50" cy="50" r="4" fill="${c[2]}"/>`;
    },
    tulip(c) {
      return `<path d="M50 70C51 80 50 88 50 97" stroke="${G2}" stroke-width="3" ${line}/>` +
        leaf(50, 94, -70, 1.3, G1) +
        `<path d="M30 40C30 20 42 14 50 22C58 14 70 20 70 40C70 62 60 72 50 72C40 72 30 62 30 40Z" fill="${c[1]}"/>` +
        `<path d="M50 72C36 72 28 58 31 36C36 29 45 31 50 42Z" fill="${c[0]}"/>` +
        `<path d="M50 72C64 72 72 58 69 36C64 29 55 31 50 42Z" fill="${c[0]}" opacity=".88"/>` +
        `<path d="M50 72C43 66 41 46 50 24C59 46 57 66 50 72Z" fill="${c[2]}"/>`;
    },
    orchid(c) {
      return R(3, (i, a) => `<ellipse cx="50" cy="28" rx="7.5" ry="19" fill="${c[0]}" transform="rotate(${a} 50 50)"/>`) +
        `<ellipse cx="50" cy="34" rx="15" ry="15" fill="${c[0]}" transform="rotate(-68 50 50)" stroke="rgba(0,0,0,.06)"/>` +
        `<ellipse cx="50" cy="34" rx="15" ry="15" fill="${c[0]}" transform="rotate(68 50 50)" stroke="rgba(0,0,0,.06)"/>` +
        `<path d="M41 56C42 50 58 50 59 56C60 66 54 72 50 72C46 72 40 66 41 56Z" fill="${c[1]}"/>` +
        `<path d="M44 56C47 54 53 54 56 56" stroke="${c[2]}" stroke-width="1.5" ${line}/>` +
        `<ellipse cx="50" cy="48" rx="3.5" ry="5" fill="${c[2]}"/>`;
    },
    calla(c) {
      return `<path d="M50 84C50 90 49 94 48 98" stroke="${G2}" stroke-width="3.4" ${line}/>` +
        `<path d="M50 86C38 70 28 50 33 30C38 14 58 10 68 19C76 27 71 37 61 38C59 58 57 74 50 86Z" fill="${c[0]}"/>` +
        `<path d="M61 38C54 36 48 30 48 22C55 18 64 20 68 26" fill="${c[1]}"/>` +
        `<ellipse cx="55" cy="40" rx="3.2" ry="12" fill="${c[2]}" transform="rotate(8 55 40)"/>`;
    },
    anthurium(c) {
      return `<path d="M50 80C30 64 18 48 22 34C26 22 42 20 50 32C58 20 74 22 78 34C82 48 70 64 50 80Z" fill="${c[0]}"/>` +
        `<path d="M50 32L50 76M50 46C42 42 34 40 28 42M50 46C58 42 66 40 72 42M50 60C43 56 36 55 32 56M50 60C57 56 64 55 68 56" stroke="${c[1]}" stroke-width="1.2" ${line}/>` +
        `<path d="M50 36C52 28 56 20 62 13" stroke="${c[2]}" stroke-width="6" ${line}/>`;
    },
    iris(c) {
      const fall = (a) => `<ellipse cx="50" cy="29" rx="12" ry="20" fill="${c[0]}" transform="rotate(${a} 50 50)"/><ellipse cx="50" cy="31" rx="3" ry="9" fill="${c[2]}" transform="rotate(${a} 50 50)"/>`;
      const std = (a) => `<ellipse cx="50" cy="30" rx="8" ry="18" fill="${c[1]}" transform="rotate(${a} 50 50)"/>`;
      return `<path d="M50 70L50 98" stroke="${G2}" stroke-width="3" ${line}/>` + leaf(50, 96, -80, 1.6, G1) +
        fall(125) + fall(180) + fall(235) + std(-32) + std(32) + std(0);
    },
    hydrangea(c, o, r) {
      const pts = [[50, 50]];
      for (let i = 0; i < 6; i++) pts.push([50 + 13 * Math.cos(i * 1.047), 50 + 13 * Math.sin(i * 1.047)]);
      for (let i = 0; i < 12; i++) pts.push([50 + 26 * Math.cos(i * 0.5236 + 0.26), 50 + 26 * Math.sin(i * 0.5236 + 0.26)]);
      return leaf(40, 76, 130, 1.1, G2) + leaf(60, 76, 50, 1.1, G1) + pts.map(([x, y], k) => {
        const rot = Math.round(r() * 90), col = k % 3 === 0 ? c[1] : c[0];
        return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})">` +
          R(4, (i, a) => `<ellipse cx="0" cy="-4.4" rx="4.3" ry="5" fill="${col}" transform="rotate(${a})"/>`) +
          `<circle r="1.4" fill="${c[2]}"/></g>`;
      }).join('');
    },
    carnation(c) {
      const ruff = (R0, amp, n, col) => {
        let d = '';
        for (let k = 0; k <= n; k++) {
          const a = (k / n) * Math.PI * 2, rr = R0 + (k % 2 ? amp : -amp * 0.3);
          d += (k ? 'L' : 'M') + (50 + rr * Math.cos(a)).toFixed(1) + ' ' + (50 + rr * Math.sin(a)).toFixed(1);
        }
        return `<path d="${d}Z" fill="${col}" stroke="rgba(0,0,0,.08)" stroke-linejoin="round"/>`;
      };
      return leaves() + ruff(28, 3.4, 44, c[0]) + ruff(21, 2.8, 36, c[1]) + ruff(13, 2.4, 26, c[0]) + ruff(6, 1.6, 16, c[2]);
    },
    dots(c, o = {}, r) {
      const size = o.size || 2.2, n = o.n || 7;
      let out = '';
      for (let b = 0; b < n; b++) {
        const tx = 16 + r() * 68, ty = 14 + r() * 44;
        out += `<path d="M50 96Q${(50 + tx) / 2 + (r() - .5) * 10} ${(96 + ty) / 2} ${tx.toFixed(1)} ${ty.toFixed(1)}" stroke="${c[2]}" stroke-width="1.1" ${line}/>`;
        const k = 5 + Math.floor(r() * 5);
        for (let j = 0; j < k; j++) {
          const x = tx + (r() - .5) * 16, y = ty + (r() - .5) * 14;
          out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * (0.7 + r() * 0.6)).toFixed(2)}" fill="${j % 3 ? c[0] : c[1]}"/>`;
        }
      }
      return out;
    },
    spike(c, o = {}) {
      const n = o.n || 7, sz = o.size || 8, both = o.both;
      let out = `<path d="M50 97L50 ${both ? 14 : 18}" stroke="${G2}" stroke-width="2.4" ${line}/>` + leaf(50, 96, -74, 1.3, G1);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), y = 82 - t * 64, s = sz * (1 - t * 0.55);
        const xs = both ? [-1, 1] : [i % 2 ? 1 : -1];
        xs.forEach((sd) => {
          const x = 50 + sd * (both ? s * 0.75 : 4.5);
          const col = (i + (sd > 0 ? 1 : 0)) % 2 ? c[1] : c[0];
          out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">` +
            R(5, (k, a) => `<ellipse cx="0" cy="${-s * 0.55}" rx="${(s * 0.42).toFixed(2)}" ry="${(s * 0.6).toFixed(2)}" fill="${col}" transform="rotate(${a})"/>`) +
            `<circle r="${(s * 0.22).toFixed(2)}" fill="${c[2]}"/></g>`;
        });
      }
      return out;
    },
    bird(c) {
      return `<path d="M40 62C44 74 46 86 47 98" stroke="${G2}" stroke-width="3.4" ${line}/>` +
        `<path d="M16 62C38 54 64 52 88 58C66 66 40 68 16 62Z" fill="${c[2]}"/>` +
        `<path d="M52 57L38 16L60 52Z" fill="${c[0]}"/><path d="M56 56L52 12L66 52Z" fill="${c[0]}" opacity=".9"/>` +
        `<path d="M60 55L68 18L70 53Z" fill="${c[0]}"/><path d="M58 56L78 28L66 55Z" fill="${c[1]}"/>`;
    },
    protea(c) {
      return leaves() +
        R(14, (i, a) => `<path d="M50 50L43 24Q50 12 57 24Z" fill="${c[0]}" stroke="rgba(0,0,0,.08)" transform="rotate(${a} 50 50)"/>`) +
        R(10, (i, a) => `<path d="M50 50L45 32Q50 24 55 32Z" fill="${c[1]}" transform="rotate(${a + 18} 50 50)"/>`) +
        `<circle cx="50" cy="50" r="12" fill="${c[2]}"/>` +
        R(16, (i, a) => `<circle cx="50" cy="42" r="1.2" fill="#fff" opacity=".65" transform="rotate(${a} 50 50)"/>`);
    },
    leafy(c, o = {}) {
      const kind = o.kind;
      let out = `<path d="M50 97C48 70 54 40 50 8" stroke="${c[2] || G2}" stroke-width="2" ${line}/>`;
      if (kind === 'round') {
        for (let i = 0; i < 7; i++) {
          const y = 84 - i * 11, r = 11 - i * 1.1;
          out += `<circle cx="${50 - r - 1}" cy="${y}" r="${r}" fill="${i % 2 ? c[1] : c[0]}"/><circle cx="${50 + r + 1}" cy="${y - 5}" r="${r}" fill="${i % 2 ? c[0] : c[1]}"/>`;
        }
      } else if (kind === 'narrow') {
        for (let i = 0; i < 8; i++) {
          const y = 88 - i * 10, s = 1.05 - i * 0.07;
          out += leaf(50, y, i % 2 ? -35 : -145, s, i % 2 ? c[0] : c[1]);
        }
      } else if (kind === 'fern') {
        for (let i = 0; i < 12; i++) {
          const y = 90 - i * 6.6, s = 0.75 - i * 0.045;
          out += leaf(50, y, -22, s, c[0]) + leaf(50, y, -158, s, c[1]);
        }
      } else if (kind === 'palm') {
        out = `<path d="M50 98L50 66" stroke="${c[2] || G2}" stroke-width="2.6" ${line}/>` +
          [-78, -52, -26, 0, 26, 52, 78].map((a, i) =>
            `<ellipse cx="50" cy="${i === 3 ? 30 : 34}" rx="8.5" ry="${i === 3 ? 26 : 22}" fill="${i % 2 ? c[1] : c[0]}" transform="rotate(${a} 50 64)"/>` +
            `<path d="M50 64L50 ${i === 3 ? 10 : 16}" stroke="rgba(255,255,255,.35)" stroke-width="1" transform="rotate(${a} 50 64)"/>`).join('');
      }
      return out;
    },
    cotton(c) {
      const boll = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">` +
        R(5, (i, a) => `<path d="M0 0L-4 -16L4 -16Z" fill="${c[2]}" transform="rotate(${a + 36})"/>`) +
        `<circle cx="-6" cy="-3" r="8" fill="${c[0]}"/><circle cx="6" cy="-3" r="8" fill="${c[1]}"/><circle cx="0" cy="6" r="8" fill="${c[0]}"/><circle cx="0" cy="-10" r="7" fill="${c[1]}"/></g>`;
      return `<path d="M52 97C50 80 44 60 34 40M50 74C58 64 64 56 70 46" stroke="${c[2]}" stroke-width="2.4" ${line}/>` +
        boll(34, 36, 1) + boll(70, 44, 0.9) + boll(52, 66, 0.8);
    },
    plume(c, o = {}, r) {
      let out = `<path d="M50 98C50 70 51 40 52 ${o.short ? 34 : 10}" stroke="${c[2]}" stroke-width="2" ${line}/>`;
      const top = o.short ? 36 : 12, bot = o.short ? 72 : 66, wid = o.short ? 13 : 17;
      for (let i = 0; i < 46; i++) {
        const t = i / 45, y = bot - t * (bot - top), w = Math.sin(Math.PI * (0.15 + t * 0.85)) * wid;
        const x = 51 + (r() - .5) * 2, side = i % 2 ? 1 : -1;
        out += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${(side * w * 0.6).toFixed(1)} -3 ${(side * w).toFixed(1)} -9" stroke="${i % 3 ? c[0] : c[1]}" stroke-width="${o.short ? 3.4 : 2.6}" ${line}/>`;
      }
      return out;
    },
    narcissus(c) {
      return `<path d="M50 60L50 98" stroke="${G2}" stroke-width="2.6" ${line}/>` + leaf(50, 97, -78, 1.5, G1) +
        R(6, (i, a) => `<ellipse cx="50" cy="31" rx="10" ry="17" fill="${c[0]}" stroke="rgba(0,0,0,.06)" transform="rotate(${a} 50 50)"/>`) +
        `<circle cx="50" cy="50" r="11" fill="${c[1]}"/><circle cx="50" cy="50" r="11" fill="none" stroke="${c[2]}" stroke-width="2" stroke-dasharray="2 1.6"/><circle cx="50" cy="50" r="4" fill="${c[2]}" opacity=".7"/>`;
    },
    anemone(c) {
      return leaves() +
        R(6, (i, a) => `<ellipse cx="50" cy="30" rx="15" ry="18" fill="${i % 2 ? c[1] : c[0]}" transform="rotate(${a} 50 50)"/>`) +
        R(22, (i, a) => `<circle cx="50" cy="35.5" r="1.3" fill="${c[2]}" transform="rotate(${a} 50 50)"/>`) +
        `<circle cx="50" cy="50" r="10" fill="${c[2]}"/><circle cx="50" cy="50" r="4" fill="${c[3] || '#fff'}" opacity=".25"/>`;
    },
    rings(c) {
      let out = leaves();
      for (let i = 0; i < 8; i++) {
        const rr = 31 - i * 3.7, off = i % 2 ? 0.9 : -0.9;
        out += `<circle cx="${50 + off}" cy="${50 - off}" r="${rr}" fill="${i % 2 ? c[1] : c[0]}" stroke="rgba(0,0,0,.07)"/>`;
      }
      return out + `<circle cx="50" cy="50" r="3" fill="${c[2]}"/>`;
    },
  };

  // ---------- کاتالوگ ----------
  // cat: main (گل اصلی) | filler (پرکننده) | leaf (شاخ و برگ) | dry (خشک و تزئینی)
  const F = [
    ['rose-holland', 'رز هلندی', 'main', 'rose', ['#C8233F', '#A91B35', '#6E0E22']],
    ['rose-iran', 'رز ایرانی', 'main', 'rose', ['#E4708A', '#D1566F', '#9C2F48']],
    ['rose-white', 'رز سفید', 'main', 'rose', ['#F6EFE6', '#EDE2D2', '#C9B79C']],
    ['rose-spray', 'رز مینیاتوری (اسپری)', 'main', 'sprayRose', ['#F2A0B4', '#E27E97', '#B04B66']],
    ['peony', 'پیونی (گل صدتومانی)', 'main', 'peony', ['#F4B4C4', '#EC98AE', '#F3D27A']],
    ['lilium', 'لیلیوم (لیلی)', 'main', 'lily', ['#FBEFF3', '#F5D7E1', '#B0305A', '#8A4B2A']],
    ['lilium-orange', 'لیلیوم آسیایی', 'main', 'lily', ['#F58A3A', '#EE7424', '#7A2E0E', '#5C2A10']],
    ['tulip', 'لاله', 'main', 'tulip', ['#E0344F', '#B82340', '#F0566C']],
    ['gerbera', 'ژربرا', 'main', 'daisy', ['#F98B3C', '#F06B2A', '#5A3A1A', '#F6C85F'], { n: 22, len: 24, w: 3.6, r: 11, double: true }],
    ['chrys-big', 'داوودی درشت', 'main', 'daisy', ['#F7D34B', '#EDBE2F', '#C99A17'], { n: 30, len: 26, w: 2.8, r: 7, double: true }],
    ['chrys-spray', 'داوودی مینیاتوری', 'main', 'daisy', ['#FFFFFF', '#F2EDE4', '#E0B92B'], { n: 14, len: 20, w: 4.6, r: 10 }],
    ['chrys-santini', 'داوودی سانتینی (پامپونی)', 'filler', 'pompon', ['#B5D46A', '#9DC04F', '#6E8F2A']],
    ['iris', 'زنبق', 'main', 'iris', ['#4B3FA8', '#6B5FCB', '#F2C230']],
    ['orchid-phal', 'ارکیده فالانوپسیس', 'main', 'orchid', ['#E9A6D8', '#B3407F', '#F6D65A']],
    ['orchid-cymb', 'ارکیده سیمبیدیوم', 'main', 'orchid', ['#C9DB8A', '#8E3A4C', '#F4EAC0']],
    ['orchid-dend', 'ارکیده دندروبیوم (سنگاپوری)', 'main', 'orchid', ['#9C4FB8', '#6B2A86', '#F4F0F6']],
    ['carnation', 'میخک (قرنفل)', 'main', 'carnation', ['#E23B5A', '#C92A48', '#9A1A33']],
    ['alstroemeria', 'آلسترومریا', 'main', 'lily', ['#F7A38C', '#F4C27A', '#6B2A1A', '#6B2A1A'], { scale: 0.86, stripes: true }],
    ['lisianthus', 'لیسیانتوس', 'main', 'rose', ['#B98AD8', '#F3EAF8', '#8A58B0'], { n: 6 }],
    ['hydrangea', 'هورتانسیا (ادریسی)', 'main', 'hydrangea', ['#8FB3E8', '#B7A4E4', '#F1F4FA']],
    ['anthurium', 'آنتوریوم', 'main', 'anthurium', ['#D81E3C', '#B01530', '#F2E3A6']],
    ['tuberose', 'مریم', 'main', 'spike', ['#FFFFFF', '#F5F0E6', '#D8CFA8'], { n: 7, size: 9 }],
    ['gladiolus', 'گلایل', 'main', 'spike', ['#F37A9C', '#E25B82', '#FBE3EA'], { n: 7, size: 11 }],
    ['narcissus', 'نرگس', 'main', 'narcissus', ['#FFFFFF', '#F7C72D', '#E4892A']],
    ['sunflower', 'آفتابگردان', 'main', 'daisy', ['#F8C531', '#EFAF1C', '#4A2E14', '#E3A44A'], { n: 20, len: 20, w: 4.6, r: 16, double: true }],
    ['calla', 'کالا (شیپوری)', 'main', 'calla', ['#FCFBF6', '#EDE9DA', '#F2C738']],
    ['ranunculus', 'رانانکولوس (آلاله)', 'main', 'rings', ['#F8B79A', '#F39F80', '#6F8A3C']],
    ['anemone', 'آنمون (شقایق هلندی)', 'main', 'anemone', ['#D7263D', '#C21E35', '#1F1A2E']],
    ['stock', 'ماتیولا (شب‌بو)', 'main', 'spike', ['#C9A6E6', '#B38CD8', '#F6EEFB'], { n: 9, size: 9, both: true }],
    ['delphinium', 'دلفینیوم', 'main', 'spike', ['#3F6FD8', '#5B86E6', '#F4F0FF'], { n: 8, size: 10 }],
    ['strelitzia', 'استرلیتزیا (پرنده بهشتی)', 'main', 'bird', ['#F7872A', '#3A57C8', '#3C6B4A']],
    ['protea', 'پروتئا', 'main', 'protea', ['#E7A3B5', '#D78399', '#EDE4DC']],
    ['aster', 'مینا (آستر)', 'filler', 'daisy', ['#9B6BD1', '#8656BE', '#F2C73B'], { n: 20, len: 20, w: 2.8, r: 8 }],
    ['marguerite', 'مارگریت (بابونه)', 'filler', 'daisy', ['#FFFFFF', '#F4F1EA', '#F2B71C'], { n: 18, len: 22, w: 3.6, r: 9 }],
    ['freesia', 'فریزیا', 'main', 'spike', ['#F8D548', '#F4BD2F', '#F8F2D0'], { n: 5, size: 11 }],
    ['hyacinth', 'سنبل', 'main', 'spike', ['#7667D9', '#8E81E6', '#F3F0FF'], { n: 8, size: 8, both: true }],
    ['cornflower', 'گل گندم', 'filler', 'daisy', ['#3D6BE0', '#2F57C4', '#1D2F7A'], { n: 12, len: 18, w: 5, r: 8 }],
    ['lavender', 'لوندر (اسطوخودوس)', 'filler', 'spike', ['#9A7BD0', '#7F62BC', '#6A4FA8'], { n: 10, size: 5, both: true }],
    ['gypsophila', 'ژیپسوفیلا (عروس)', 'filler', 'dots', ['#FFFFFF', '#F2EFE8', '#8FA77A'], { size: 2.4, n: 7 }],
    ['statice', 'استاتیس (لیمونیوم)', 'filler', 'dots', ['#8E6BD6', '#B79CEB', '#7A9A62'], { size: 3, n: 6 }],
    ['caspia', 'کاسپیا', 'filler', 'dots', ['#C8B7E8', '#DCD0F2', '#9AAE88'], { size: 1.7, n: 8 }],
    ['waxflower', 'واکس‌فلاور', 'filler', 'dots', ['#F4B6CC', '#FBDDE7', '#6F8F55'], { size: 3.2, n: 6 }],
    ['mimosa', 'میموزا', 'filler', 'dots', ['#F6D23A', '#F0BF1E', '#8FAA7A'], { size: 3.2, n: 7 }],
    ['eucalyptus', 'اکالیپتوس', 'leaf', 'leafy', ['#8FB3A6', '#A8C5BA', '#6C8E82'], { kind: 'round' }],
    ['ruscus', 'رسکوس', 'leaf', 'leafy', ['#3F7A48', '#4F8E57', '#2E5A36'], { kind: 'narrow' }],
    ['fern', 'سرخس', 'leaf', 'leafy', ['#5C9A4E', '#4B8742', '#3A6B34'], { kind: 'fern' }],
    ['aralia', 'برگ آرالیا', 'leaf', 'leafy', ['#2F6B3E', '#3C7F4B', '#2A5733'], { kind: 'palm' }],
    ['pittosporum', 'پیتوسپوروم', 'leaf', 'leafy', ['#6E9A5C', '#9CBF86', '#4E7440'], { kind: 'narrow' }],
    ['cotton', 'شاخه پنبه', 'dry', 'cotton', ['#FFFFFF', '#F3EFE7', '#6A4A30']],
    ['pampas', 'پامپاس', 'dry', 'plume', ['#E8D7BC', '#D6C09C', '#B89C74']],
    ['lagurus', 'لاگوروس (دم‌خرگوشی)', 'dry', 'plume', ['#F1E8D8', '#E3D4BA', '#A89272'], { short: true }],
  ];

  const FLOWERS = F.map(([id, name, cat, shape, c, o]) => ({ id, name, cat, shape, c, o: o || {} }));

  // روشنایی رنگ؛ برای گل‌های سفید یک خط دور ظریف می‌کشیم تا روی زمینه روشن گم نشوند
  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.86;
  }
  function flowerSVG(fl) {
    const fn = S[fl.shape] || S.daisy;
    const r = rng(fl.id);
    let body = fn(fl.c, fl.o, r);
    if (isLight(fl.c[0])) body = `<g stroke="rgba(74,52,66,.32)" stroke-width=".9">${body}</g>`;
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
  }
  window.isLightColor = isLight;

  // تصویر پیش‌فرض برای گل‌هایی که خودت اضافه می‌کنی
  function customSVG(color) {
    return flowerSVG({ id: 'custom' + color, shape: 'daisy', c: [color, color, '#F2C73B'], o: { n: 12, len: 22, w: 5, r: 9 } });
  }

  window.FLOWER_CATS = [
    ['all', 'همه'], ['main', 'گل اصلی'], ['filler', 'پرکننده'], ['leaf', 'شاخ و برگ'], ['dry', 'خشک و تزئینی'], ['mine', 'افزوده‌های من'],
  ];
  window.FLOWERS = FLOWERS;
  window.flowerSVG = flowerSVG;
  window.customSVG = customSVG;
})();
