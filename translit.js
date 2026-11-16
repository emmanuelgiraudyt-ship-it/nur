/* NÛR — phonétique automatique du texte Warsh (KFGQPC v0.10).
   Aide à la lecture pour les débutants : elle ne remplace ni le texte arabe ni un enseignant.
   Conventions : ou = « ou » français, â î oû = voyelles longues, ḥ ṣ ḍ ṭ ẓ = lettres emphatiques,
   ʿ = ʿayn, ' = hamza, dh th kh gh ch dj = sons composés. À la fin du verset, la forme de pause est donnée. */
(function (root) {
  "use strict";
  var FATHA = "َ", DAMMA = "ُ", KASRA = "ِ", SHADDA = "ّ", SUKUN = "ْ", MADDA = "ٓ",
    DAGGER = "ٰ", TAQLIL = "۪", HIGHDOT = "۬", ZERO = "۟", SMEEM = "ۢ";
  var TAN_A = "ًٗ", TAN_U = "ٌٞ", TAN_I = "ٍٖ";
  var MARKS = FATHA + DAMMA + KASRA + SHADDA + SUKUN + MADDA + DAGGER + TAQLIL + HIGHDOT + ZERO + SMEEM + TAN_A + TAN_U + TAN_I;
  var C = { "ب": "b", "ت": "t", "ث": "th", "ج": "dj", "ح": "ḥ", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "ch",
    "ص": "ṣ", "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ة": "t" };
  var HAMZA = "ءأإؤئ", YEH = "يىے", PREFIX = "وفبكلتأ";
  var LONG = { a: "â", i: "î", ou: "oû" };
  // lettres isolées en tête de sourate
  var MUQ = { "الم": "alif lâm mîm", "المص": "alif lâm mîm ṣâd", "الر": "alif lâm râ", "المر": "alif lâm mîm râ", "كهيعص": "kâf hâ yâ ʿayn ṣâd",
    "طه": "ṭâ hâ", "طسم": "ṭâ sîn mîm", "طس": "ṭâ sîn", "يس": "yâ sîn", "ص": "ṣâd", "حم": "ḥâ mîm", "عسق": "ʿayn sîn qâf", "ق": "qâf", "ن": "noûn" };
  var MUQ_SURAS = [2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38, 40, 41, 42, 43, 44, 45, 46, 50, 68];

  var EXC = { "اَ۟ذَا": "a'idhâ", "اَ۟لَٰهٞ": "a'ilâhoun" };
  function has(t, set) { for (var i = 0; i < t.m.length; i++) if (set.indexOf(t.m.charAt(i)) >= 0) return true; return false; }
  function vowelOf(t) { return has(t, FATHA) ? "a" : has(t, KASRA) ? "i" : has(t, DAMMA) ? "ou" : null; }
  function tanOf(t) { return has(t, TAN_A) ? "an" : has(t, TAN_I) ? "in" : has(t, TAN_U) ? "oun" : null; }
  function tokens(w) {
    var out = [], i, ch;
    for (i = 0; i < w.length; i++) {
      ch = w.charAt(i);
      if (MARKS.indexOf(ch) >= 0) { if (out.length) out[out.length - 1].m += ch; }
      else out.push({ l: ch, m: "" });
    }
    return out;
  }
  function isConsonant(t) { return !!C[t.l] || HAMZA.indexOf(t.l) >= 0; }
  // consonne « sâkin » : sukûn, chadda, ou aucune marque (noun ou lettre assimilée)
  function sakin(t, after) {
    if (!t) return false;
    if (after && t.m === "" && (after.l === "ا" || after.l === "ى") && tanOf(after)) return false;
    if (t.l === "ا" || t.l === "ۥ" || t.l === "ۦ" || t.l === "ۧ") return false;
    if (has(t, SUKUN) || has(t, SHADDA)) return true;
    return t.m === "" && isConsonant(t);
  }
  function tanSeat(t) { return !!t && (t.l === "ا" || t.l === "ى") && ((!!tanOf(t) && !vowelOf(t)) || (!!vowelOf(t) && has(t, SMEEM))); }
  function isWasl(t) { return t && t.l === "ا" && (has(t, HIGHDOT) || has(t, TAQLIL) || has(t, ZERO)); }
  function isAllah(T, j) { // T[j] = lâm de l'article sans marque
    var a = T[j + 1], h = T[j + 2];
    if (!a || !h || a.l !== "ل" || h.l !== "ه") return false;
    if (has(h, SUKUN)) return false;
    if (j + 2 === T.length - 1) return true;
    return j + 3 === T.length - 1 && T[j + 3].l === "م" && has(T[j + 3], SHADDA);
  }

  function word(w, first, pv) {
    var T = tokens(w), seg = [], i = 0, j, t, naql = null;
    function push(s, k, x) { seg.push({ s: s, k: k || "c", tm: !!x }); }
    function last() { return seg.length ? seg[seg.length - 1] : null; }
    function lengthen(v) { var l = last(); if (l && l.k === "sv" && l.s === v) { l.s = LONG[v]; l.k = "lv"; return true; } return false; }
    function cons(t, c, noDouble) {
      var dbl = has(t, SHADDA) && !noDouble;
      push(dbl ? (c.length > 1 ? c + "-" + c : c + c) : c, "c", t.l === "ة");
    }
    function vow(t) {
      var v = vowelOf(t), tn = tanOf(t);
      if (tn) { push(has(t, SMEEM) ? tn.replace("n", "m") : tn, "tan"); return; }
      if (!v && has(t, TAQLIL)) v = "a";
      if (has(t, DAGGER)) { push("â", "lv"); return; }
      if (v) { push(v, "sv"); if (has(t, SMEEM)) push("m", "c"); }
    }
    function article(j) { // j = index du lâm ; renvoie l'index où reprendre
      var lam = T[j], x = T[j + 1];
      if (has(lam, SUKUN)) { push("l-"); return j + 1; }
      if (lam.m === "" && x) {
        if (isAllah(T, j)) { push("ll"); push("â", "lv"); return j + 2; }
        if (has(x, SHADDA) && C[x.l]) { push(C[x.l] + "-"); cons(x, C[x.l], true); vow(x); return j + 2; }
        push("ll"); push("a", "sv"); return j + 1;
      }
      return j; // lâm vocalisé (naql) : lecture ordinaire
    }
    function softHamza() {
      var a = T[0], n = T[1];
      if (has(a, HIGHDOT)) return !articleLam(1);
      if (!vowelOf(a)) return true;
      return !(sakin(n) || (n && n.m === "" && (n.l === "ي" || n.l === "و")));
    }
    function articleLam(j) {
      var lam = T[j];
      if (!lam || lam.l !== "ل") return false;
      if (has(lam, SUKUN) || lam.m === "") return true;
      return !!vowelOf(lam) && !has(lam, SHADDA) && T[j + 1] && T[j + 1].l === "ا";
    }

    // 0. petit mot dont la hamza est adoucie après une autre hamza (in, an, idh, aw, am)
    if (T.length === 2 && T[0].l === "ا" && !tanOf(T[0]) && !has(T[0], SUKUN + DAGGER + MADDA + ZERO) && (C[T[1].l] || T[1].l === "و") && (isWasl(T[0]) || T[0].m === "")) {
      push(vowelOf(T[0]) || (has(T[0], TAQLIL) ? "i" : pv || "a"), "sv"); i = 1;
    } else
    // 0 bis. hamza adoucie (tashîl) en tête d'un mot plus long : elle se prononce
    if (isWasl(T[0]) && softHamza()) {
      push(vowelOf(T[0]) || (has(T[0], TAQLIL) ? "i" : "ou"), "sv"); i = 1;
    } else
    // 1. alif de liaison en tête de mot
    if (isWasl(T[0])) {
      if (first) push(has(T[0], HIGHDOT) ? "a" : has(T[0], TAQLIL) ? "i" : "ou", "sv");
      i = 1;
      if (T[1] && T[1].l === "ل" && has(T[0], HIGHDOT)) i = article(1);
    } else {
      // 2. préfixes (wa, fa, bi, ka, li…) suivis de l'article
      j = 0;
      while (j < 3 && T[j] && PREFIX.indexOf(T[j].l) >= 0 && vowelOf(T[j]) && !has(T[j], SHADDA + SUKUN + DAGGER)) j++;
      if (j > 0 && T[j] && T[j].l === "ا" && T[j].m === "" && articleLam(j + 1)) {
        for (i = 0; i < j; i++) { if (HAMZA.indexOf(T[i].l) >= 0) { if (i > 0) push("'"); } else cons(T[i], T[i].l === "و" ? "w" : C[T[i].l], true); vow(T[i]); }
        i = article(j + 1);
      } else i = 0;
    }

    for (; i < T.length; i++) {
      t = T[i];
      var nx = T[i + 1], l = last(), v;
      if (t.l === "ا") {
        if (has(t, SUKUN) || (i > 0 && isWasl(t))) continue;
        if (has(t, ZERO)) continue;
        if (tanOf(t)) { vow(t); continue; }
        v = vowelOf(t);
        if (v && has(t, SMEEM)) { push(v + "m", "tan"); continue; }
        if (v && i > 0) { if (l && l.k === "sv" && l.s === v) continue; push("'"); push(v, "sv"); continue; }
        if (v) { if (i === 0) naql = v; if (has(t, DAGGER)) push(LONG[v], "lv"); else push(v, "sv"); continue; }
        if (has(t, DAGGER)) { if (!lengthen("a")) push("â", "lv"); continue; }
        if (l && l.k === "sv" && l.s === "a") { if (has(t, MADDA) || !sakin(nx, T[i + 2])) lengthen("a"); }
        continue;
      }
      if (HAMZA.indexOf(t.l) >= 0) { if (seg.length) push("'"); if (!vowelOf(t) && !tanOf(t) && has(t, MADDA)) push("â", "lv"); else vow(t); continue; }
      if (t.l === "و") {
        if (vowelOf(t) || tanOf(t) || has(t, SHADDA) || has(t, TAQLIL) || tanSeat(nx)) { cons(t, "w", i === 0); vow(t); continue; }
        if (has(t, DAGGER)) { if (!lengthen("a")) { push("w"); push("â", "lv"); } continue; }
        if (has(t, ZERO)) continue;
        if (has(t, SUKUN)) { if (l && l.k === "sv" && l.s === "ou") continue; push("w"); continue; }
        if (!lengthen("ou")) { if (l && l.k === "sv" && l.s === "a") push("w"); else if (!l || l.k === "c") push("oû", "lv"); }
        continue;
      }
      if (YEH.indexOf(t.l) >= 0) {
        if (t.l === "ى" && tanOf(t) && !vowelOf(t)) { vow(t); continue; }
        if (vowelOf(t) || tanOf(t) || has(t, SHADDA) || has(t, TAQLIL) || tanSeat(nx)) { cons(t, "y", i === 0); vow(t); continue; }
        if (has(t, DAGGER)) { if (!lengthen("a")) { push("y"); push("â", "lv"); } continue; }
        if (has(t, ZERO)) continue;
        if (has(t, SUKUN)) { if (lengthen("i")) continue; push("y"); continue; }
        if (!lengthen("i") && !lengthen("a")) { if (!l || l.k === "c") push("î", "lv"); }
        continue;
      }
      if (t.l === "ۥ") { if (!lengthen("ou")) push("oû", "lv"); continue; }
      if (t.l === "ۦ" || t.l === "ۧ") { if (!lengthen("i")) { if (!l || l.k !== "lv") push("î", "lv"); } continue; }
      if (t.l === "ۨ") { push("n"); continue; }
      if (!C[t.l]) continue;
      if (has(t, ZERO)) continue;
      // « li-llâh »
      if (t.l === "ل" && has(t, KASRA) && nx && nx.l === "ل" && T[i + 2] && T[i + 2].l === "ه" && i + 2 === T.length - 1 && !has(T[i + 2], SUKUN) && (nx.m === "" || (has(nx, SHADDA) && has(nx, FATHA)))) {
        push("l"); push("i", "sv"); push("ll"); push("â", "lv"); i += 1; continue;
      }
      // lettre sans marque assimilée dans la suivante (ʿabattoum)
      if (t.m === "" && nx && C[nx.l] && has(nx, SHADDA) && t.l !== "ن" && t.l !== "م") continue;
      if (t.l === "ن" && has(t, SMEEM) && !vowelOf(t)) { push("m"); continue; }
      cons(t, C[t.l], i === 0);
      vow(t);
    }
    return { seg: seg, naql: naql };
  }

  function pause(seg) {
    var l = seg[seg.length - 1], p;
    if (!l) return;
    if (l.k === "sv") seg.pop();
    else if (l.k === "tan") {
      p = seg[seg.length - 2];
      if (l.s.charAt(0) === "a" && !(p && p.tm)) { l.s = "â"; l.k = "lv"; return; }
      seg.pop();
    } else return;
    l = seg[seg.length - 1];
    if (l && l.tm) l.s = "h";
  }

  function clean(text) {
    return String(text || "")
      .replace(/[٠-٩۞۩ۖ‏]/g, "").replace(/ /g, " ")
      .replace(/ـ?([َُِْ])[ٕٔ]/g, "ء$1")
      .replace(/[يىےوے]?ـ?[ٕٔ]/g, "ء")
      .replace(/ـ/g, "").replace(/\s+/g, " ").trim();
  }
  function skeleton(w) { return w.replace(/[^ء-ي]/g, "").replace(/[أإ]/g, "ا"); }

  function phon(text, sura, verse) {
    var words = clean(text).split(" "), out = [], k = 0, i, w, r, prev = null, l;
    if (verse === 1 && MUQ_SURAS.indexOf(sura) >= 0) {
      while (k < 2 && words[k] && MUQ[skeleton(words[k])]) { out.push({ seg: [{ s: MUQ[skeleton(words[k])], k: "lv" }], naql: null, fixed: true }); k++; }
    }
    for (i = k; i < words.length; i++) {
      w = words[i]; if (!w) continue;
      l = prev ? prev.seg[prev.seg.length - 1] : null;
      if (EXC[w]) { prev = { seg: [{ s: EXC[w], k: "lv" }], naql: null }; out.push(prev); continue; }
      r = word(w, out.length === 0 || (prev === null && out.length > 0), l && l.k === "sv" ? l.s : null);
      if (!r.seg.length) continue;
      if (r.naql && prev && !prev.fixed) { l = prev.seg[prev.seg.length - 1]; if (l && l.k === "sv" && l.s === r.naql && prev.seg.length > 1) prev.seg.pop(); }
      out.push(r); prev = r;
    }
    if (prev) pause(prev.seg);
    return out.map(function (x) { return x.seg.map(function (s) { return s.s; }).join(""); }).join(" ").replace(/-(?= |$)/g, "");
  }

  root.NUR_PHON = phon;
  if (typeof module !== "undefined" && module.exports) module.exports = phon;
})(typeof window !== "undefined" ? window : this);
