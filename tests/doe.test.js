// 실행: node tests/doe.test.js
// index.html 의 @doe-core-start ~ @doe-core-end 구간(DOE 순수 로직)만 읽어서 테스트한다.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const core = html.slice(html.indexOf("// @doe-core-start"), html.indexOf("// @doe-core-end"));
const ctx = {};
vm.createContext(ctx);
const NAMES = ["OA_CATALOG", "findOA", "fullFactorial", "paramCount", "dOptimal", "designOptions", "buildDesign", "makeTerms",
               "anovaFit", "autoPool", "predictModel", "lsMeans", "optimizeLevels", "fPValue", "tInv", "codeLevel", "xtx", "modelRow", "logDetSym"];
vm.runInContext(`${core}\nObject.assign(this, { ${NAMES.join(", ")} });`, ctx);
const D = ctx;
// vm 안에서 만든 배열은 다른 realm 이라 deepStrictEqual 전에 JSON 으로 옮긴다
const plain = v => JSON.parse(JSON.stringify(v));

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
}
const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

// 두 열의 모든 수준 조합이 같은 횟수로 나오면 직교 (강도 2)
function assertOrthogonal(rows, name) {
  const nc = rows[0].length, lv = rows[0].map((_, c) => Math.max(...rows.map(r => r[c])) + 1);
  for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
    const cnt = {};
    rows.forEach(r => { const k = `${r[a]},${r[b]}`; cnt[k] = (cnt[k] || 0) + 1; });
    const expect = rows.length / (lv[a] * lv[b]);
    assert.strictEqual(Object.keys(cnt).length, lv[a] * lv[b], `${name} 열 ${a},${b}: 조합 누락`);
    Object.values(cnt).forEach(v => assert.strictEqual(v, expect, `${name} 열 ${a},${b}: 불균형`));
  }
}

// ----- 직교배열 -----
test("직교배열 10종: 크기와 직교성 (L18 표준표 포함)", () => {
  const expect = { "L4": [4, "2^3"], "L8": [8, "2^7"], "L9": [9, "3^4"], "L12": [12, "2^11"], "L16": [16, "2^15"],
                   "L16 (4수준)": [16, "4^5"], "L18": [18, "2^1 3^7"], "L25": [25, "5^6"], "L27": [27, "3^13"], "L32": [32, "2^31"] };
  D.OA_CATALOG.forEach(oa => {
    const [runs, sig] = expect[oa.name];
    assert.strictEqual(oa.rows.length, runs, oa.name);
    const cnt = {};
    oa.levels.forEach(L => { cnt[L] = (cnt[L] || 0) + 1; });
    assert.strictEqual(Object.keys(cnt).sort().map(L => `${L}^${cnt[L]}`).join(" "), sig, oa.name);
    assertOrthogonal(oa.rows, oa.name);
  });
});

test("설계 추천: 인자·수준 수에 맞는 가장 작은 직교배열", () => {
  const rec = lv => { const o = D.designOptions(lv); return o.recommended === "oa" ? o.oa.name : o.recommended; };
  assert.strictEqual(rec([3, 3, 3, 3]), "L9");
  assert.strictEqual(rec([2, 3, 3, 3, 3]), "L18");
  assert.strictEqual(rec([3, 3, 3, 3, 3, 3]), "L18");
  assert.strictEqual(rec(Array(7).fill(2)), "L8");
  assert.strictEqual(rec(Array(8).fill(2)), "L12");
  assert.strictEqual(rec(Array(12).fill(2)), "L16");
  assert.strictEqual(rec([4, 4, 4, 4, 4]), "L16 (4수준)");
  assert.strictEqual(rec([5, 5, 5]), "L25");
  assert.strictEqual(rec([3, 3]), "full");            // 완전요인 9 run = L9 → 완전요인
  assert.strictEqual(rec([2, 4]), "full");            // 맞는 배열 없음, 완전요인 8 run
  assert.strictEqual(rec([2, 2, 4, 3]), "dopt");      // 혼합 수준 → D-최적
  const o = D.designOptions(Array(7).fill(2), [[0, 1]]);
  assert.strictEqual(o.oa, null);                     // 교호작용 선택 시 직교배열 안 씀
  assert.strictEqual(o.recommended, "dopt");
  assert.strictEqual(o.p, 9);
});

test("buildDesign: 직교배열 열 배정 (L18 에 2수준 1개 + 3수준 4개)", () => {
  const d = D.buildDesign("oa", [3, 3, 2, 3, 3]);
  assert.strictEqual(d.label, "L18 직교배열");
  assert.strictEqual(d.rows.length, 18);
  assertOrthogonal(d.rows, "L18 배정");
  assert.deepStrictEqual(plain(d.rows.map(r => r[2])).filter(v => v > 1), []);   // 2수준 인자는 0/1 만
});

// ----- D-최적 -----
test("D-최적: 2^3 에서 4 run 이면 직교 반실시를 찾는다 (det = 4^4)", () => {
  const d = D.dOptimal([2, 2, 2], 4, { seed: 1 });
  close(d.logDet, 4 * Math.log(4));
  assertOrthogonal(d.rows, "D-opt 2^3/4");
});
test("D-최적: 3수준 5인자 14 run — 추정 가능, 시드 고정이면 같은 설계", () => {
  const a = D.dOptimal([3, 3, 3, 3, 3], 14, { seed: 7 }), b = D.dOptimal([3, 3, 3, 3, 3], 14, { seed: 7 });
  assert.ok(Number.isFinite(a.logDet));
  assert.deepStrictEqual(plain(a.rows), plain(b.rows));
  // 같은 run 수의 단순 순환 균형 설계보다 det 가 커야 한다
  const naive = Array.from({ length: 14 }, (_, i) => [0, 1, 2, 3, 4].map(f => (i + f * Math.floor(i / 3)) % 3));
  const naiveLd = D.logDetSym(D.xtx(naive.map(r => D.modelRow(r, [3, 3, 3, 3, 3], D.makeTerms(5)))));
  assert.ok(a.logDet > naiveLd, `${a.logDet} <= ${naiveLd}`);
});
test("D-최적: 교호작용 포함 (A×B) 도 추정 가능", () => {
  const d = D.dOptimal([2, 3, 3], 12, { inters: [[0, 1]], seed: 3 });
  assert.ok(Number.isFinite(d.logDet));
  assert.throws(() => D.dOptimal([3, 3, 3], 5), /최소 7/);
});

// ----- 통계 분포 -----
test("F 분포 p 값, t 분포 분위수 (표 값과 비교)", () => {
  close(D.fPValue(4.103, 2, 10), 0.05, 2e-3);
  close(D.fPValue(4.965, 1, 10), 0.05, 2e-3);
  close(D.fPValue(0, 3, 8), 1);
  close(D.tInv(0.975, 10), 2.228, 1e-3);
  close(D.tInv(0.975, 2), 4.303, 1e-3);
  close(D.tInv(0.975, 30), 2.042, 1e-3);
});

// ----- ANOVA -----
const sum = a => a.reduce((s, v) => s + v, 0);
test("ANOVA: 직교 설계에서 제곱합 = 수준 평균 공식, 합계 = 총제곱합", () => {
  const rows = D.buildDesign("oa", [3, 3, 2, 3, 3]).rows;
  const y = rows.map(([a, b, c, d, e], i) => 200 - 14 * a - 32 * b - 18 * c + [0, -9, -12][d] + [0, -3, -4][e] + ((i * 7) % 5 - 2));
  const levels = [3, 3, 2, 3, 3];
  const fit = D.anovaFit({ levels, rows, y, terms: D.makeTerms(5) });
  const mean = sum(y) / y.length;
  levels.forEach((L, f) => {
    let ss = 0;
    for (let j = 0; j < L; j++) {
      const g = y.filter((_, i) => rows[i][f] === j);
      ss += g.length * (sum(g) / g.length - mean) ** 2;
    }
    close(fit.table[f].ss, ss);
    assert.strictEqual(fit.table[f].df, L - 1);
  });
  close(sum(fit.table.map(t => t.ss)) + fit.sse, fit.sst);
  assert.strictEqual(fit.dfE, 18 - 1 - 9);
  close(fit.table[1].p, D.fPValue(fit.table[1].F, 2, fit.dfE));
  // 주효과도 = 수준 평균 (직교 설계)
  const lsm = D.lsMeans(levels, rows, y);
  const g = y.filter((_, i) => rows[i][1] === 2);
  close(lsm[1][2], sum(g) / g.length);
});

test("ANOVA: 반복 있는 2×2 완전요인 — 교호작용과 오차 제곱합", () => {
  const rows = D.fullFactorial([2, 2]).flatMap(r => [r, r]);
  const y = [10, 12, 20, 22, 30, 32, 60, 62];   // A×B 교호작용 있음, 반복 차이 2
  const fit = D.anovaFit({ levels: [2, 2], rows, y, terms: D.makeTerms(2, [[0, 1]]) });
  close(fit.sse, 4 * 2);                // 각 칸 (−1, +1)² 의 합
  assert.strictEqual(fit.dfE, 4);
  const ab = fit.table.find(t => t.key === "A×B");
  close(ab.ss, 8 * (((60 + 62 + 10 + 12) - (20 + 22 + 30 + 32)) / 8) ** 2);   // 대비 제곱합
  close(fit.r2, 1 - fit.sse / fit.sst);
});

test("자동 풀링: L9 에 3수준 4인자 (오차 자유도 0) → 가장 작은 인자를 풀링", () => {
  const rows = D.buildDesign("oa", [3, 3, 3, 3]).rows;
  const y = rows.map(([a, b, c, d]) => 50 + 10 * a - 6 * b + 3 * c + 0.4 * d * d);
  const { pooled, fit } = D.autoPool({ levels: [3, 3, 3, 3], rows, y, terms: D.makeTerms(4) });
  assert.deepStrictEqual(plain(pooled), ["D"]);
  assert.strictEqual(fit.dfE, 2);
  assert.ok(fit.table[0].p < fit.table[2].p);   // A 가 C 보다 유의
});

test("결측 run 은 빼고 분석", () => {
  const rows = D.fullFactorial([3, 3]);
  const y = rows.map(([a, b]) => a + 2 * b);
  y[4] = NaN;
  const fit = D.anovaFit({ levels: [3, 3], rows, y, terms: D.makeTerms(2) });
  assert.strictEqual(fit.n, 8);
  assert.deepStrictEqual(plain(fit.used), [0, 1, 2, 3, 5, 6, 7, 8]);
});

// ----- 최적화 -----
function models3() {
  const levels = [3, 3, 2], rows = D.fullFactorial(levels);
  const fitOf = f => D.anovaFit({ levels, rows, y: rows.map(f), terms: D.makeTerms(3) }).model;
  return { levels, models: { y: fitOf(([a, b, c]) => 10 * a - 5 * b + 3 * c), z: fitOf(([a, b, c]) => a + b + c) } };
}
test("최적화: 최소화, 조건, 고정 인자", () => {
  const { levels, models } = models3();
  const all = [true, true, true], fixed = [0, 0, 0];
  let r = D.optimizeLevels({ levels, models, objective: { resp: "y", goal: "min" }, control: all, fixed });
  assert.deepStrictEqual(plain(r.top[0].levels), [0, 2, 0]);
  close(r.top[0].preds.y, -10);
  assert.ok(r.exhaustive && r.evaluated === 18 && r.top.length === 5);

  r = D.optimizeLevels({ levels, models, objective: { resp: "y", goal: "min" }, constraints: [{ resp: "z", op: "<=", value: 1 }], control: all, fixed });
  assert.deepStrictEqual(plain(r.top[0].levels), [0, 1, 0]);
  assert.ok(r.top[0].feasible);

  r = D.optimizeLevels({ levels, models, objective: { resp: "y", goal: "min" }, control: [false, true, true], fixed: [2, 0, 0] });
  assert.deepStrictEqual(plain(r.top[0].levels), [2, 2, 0]);

  r = D.optimizeLevels({ levels, models, objective: { resp: "y", goal: "target", target: 8 }, control: all, fixed });
  close(r.top[0].preds.y, 8);                     // 10·1 − 5·1 + 3·1 = 8
  r = D.optimizeLevels({ levels, models, objective: { resp: "z", goal: "max" }, control: all, fixed });
  assert.deepStrictEqual(plain(r.top[0].levels), [2, 2, 1]);
});
test("최적화: 조건을 만족하는 조합이 없으면 위반이 가장 작은 조합", () => {
  const { levels, models } = models3();
  const r = D.optimizeLevels({ levels, models, objective: { resp: "y", goal: "min" }, constraints: [{ resp: "z", op: "<=", value: -1 }],
                               control: [true, true, true], fixed: [0, 0, 0] });
  assert.strictEqual(r.top[0].feasible, false);
  assert.deepStrictEqual(plain(r.top[0].levels), [0, 0, 0]);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
