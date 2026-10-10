// 실행: node tests/rating.test.js
// index.html 의 @core-start ~ @core-end 구간(DOM 없는 순수 로직)만 읽어서 테스트한다.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const core = html.slice(html.indexOf("// @core-start"), html.indexOf("// @core-end"));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(core + "\nObject.assign(this, { PROTOCOL, parseCsv, bandOf, subRating, rateRun });", ctx);
const { PROTOCOL, parseCsv, bandOf, subRating, rateRun } = ctx;

const G = 0, A = 1, M = 2, P = 3;
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// ----- 경계값: 상한과 같으면 더 좋은 등급 -----
test("bandOf 경계값 (lower 150/225/300)", () => {
  const t = [150, 225, 300];
  assert.strictEqual(bandOf(0, t), G);
  assert.strictEqual(bandOf(150, t), G);
  assert.strictEqual(bandOf(150.01, t), A);
  assert.strictEqual(bandOf(225, t), A);
  assert.strictEqual(bandOf(300, t), M);
  assert.strictEqual(bandOf(300.01, t), P);
});

// ----- 서브레이팅 -----
test("subRating 최빈 구간", () => {
  assert.strictEqual(subRating([G, G, G, A]), G);
  assert.strictEqual(subRating([A, A, G, A]), A);
});
test("subRating 동률이면 더 나쁜 구간", () => {
  assert.strictEqual(subRating([G, G, A, A]), A);
  assert.strictEqual(subRating([G, M]), M);
});
test("subRating 최악값보다 한 단계 넘게 좋을 수 없음", () => {
  assert.strictEqual(subRating([G, G, G, G, G, P]), M);
  assert.strictEqual(subRating([G, G, G, M]), A);
  assert.strictEqual(subRating([G, G, G, A]), G);   // 한 단계 차이는 허용
});
test("subRating 빈 그룹은 null", () => {
  assert.strictEqual(subRating([]), null);
});

// ----- rateRun -----
const valuesAll = v => Object.fromEntries(PROTOCOL.locations.map(l => [l.key, v]));
test("rateRun 종합 = lower/upper 중 나쁜 쪽", () => {
  const values = valuesAll(10);           // 전부 Good
  values.upper_dash = 130;                // upper: G,G,M,G → 최악 M 제한으로 A
  const r = rateRun({ values });
  assert.strictEqual(r.lower, G);
  assert.strictEqual(r.upper, A);
  assert.strictEqual(r.overall, A);
});
test("rateRun 그룹 전체 누락이면 종합 null", () => {
  const values = {};
  PROTOCOL.locations.filter(l => l.group === "lower").forEach(l => { values[l.key] = 10; });
  const r = rateRun({ values });
  assert.strictEqual(r.lower, G);
  assert.strictEqual(r.upper, null);
  assert.strictEqual(r.overall, null);
});

// ----- 샘플 CSV 파싱 -----
const sample = f => parseCsv(fs.readFileSync(path.join(root, "samples", f), "utf8"), f);

test("parseCsv R001: run_id, 이름, 집계 규칙", () => {
  const run = sample("R001_baseline.csv");
  assert.strictEqual(run.runId, "1");
  assert.strictEqual(run.name, "baseline");
  assert.deepStrictEqual([...run.warnings], []);
  close(run.values.lower_hinge_pillar, (75.44 + 92.0 + 83.72) / 3);  // resultant 3점 평균
  close(run.values.upper_hinge_pillar, (72.98 + 89.0 + 80.99) / 3);
  close(run.values.rocker_lat, (27.9 + 35.65 + 29.45) / 3);          // dy 3점 평균
  close(run.values.steering_long, 42.0);                             // dx
  close(run.values.left_toepan, 184.0);                              // resultant
  assert.strictEqual(Object.keys(run.values).length, 10);
});
test("parseCsv 파일명 → 이름", () => {
  assert.strictEqual(sample("R002_A-pillar_reinforced.csv").name, "A-pillar reinforced");
  assert.strictEqual(sample("R003_toepan_thickness_up.csv").runId, "3");
});
test("샘플 판정 결과", () => {
  const r1 = rateRun(sample("R001_baseline.csv"));
  // lower: toepan 184 A, 나머지 G → G / upper: hinge 81.0 A, IP 134 M → 최악 제한 A
  assert.deepStrictEqual({ ...r1 }, { lower: G, upper: A, overall: A });
  assert.deepStrictEqual({ ...rateRun(sample("R002_A-pillar_reinforced.csv")) }, { lower: G, upper: G, overall: G });
  assert.deepStrictEqual({ ...rateRun(sample("R003_toepan_thickness_up.csv")) }, { lower: G, upper: G, overall: G });
});

// ----- 오류/경고 -----
test("parseCsv 알 수 없는 위치·누락 위치는 경고", () => {
  const run = parseCsv("run_id,location,point,resultant_mm\n7,Footrest,1,100\n7,Mystery,1,5\n", "x.csv");
  assert.strictEqual(run.runId, "7");
  close(run.values.footrest, 100);
  assert.strictEqual(run.warnings.length, 2);
});
test("parseCsv run_id 가 섞이면 오류", () => {
  assert.throws(() => parseCsv("run_id,location,resultant_mm\n1,Footrest,1\n2,Footrest,2\n", "x.csv"), /run_id/);
});
test("parseCsv 숫자가 아닌 값은 오류", () => {
  assert.throws(() => parseCsv("run_id,location,resultant_mm\n1,Footrest,abc\n", "x.csv"), /숫자/);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
