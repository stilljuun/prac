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
vm.runInContext(core + "\nObject.assign(this, { PROTOCOL, PROTOCOLS, parseCsv, csvLocationNames, detectProtocol, bandOf, subRating, rateRun, runFolderOf, pickCsvTargets, toggleChart, removeFromChart });", ctx);
const { PROTOCOL, PROTOCOLS, parseCsv, csvLocationNames, detectProtocol, bandOf, subRating, rateRun, runFolderOf, pickCsvTargets, toggleChart, removeFromChart } = ctx;

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

// ----- run 폴더 구조: <run 폴더>/<서브폴더>/results.csv -----
test("runFolderOf: results.csv 두 단계 위 폴더가 run 폴더", () => {
  assert.strictEqual(runFolderOf("runs/R001_baseline/output/results.csv"), "R001_baseline");
  assert.strictEqual(runFolderOf("R001_baseline/output/results.csv"), "R001_baseline");
  assert.strictEqual(runFolderOf("C:\\data\\R007_x\\post\\results.csv"), "R007_x");
});
test("pickCsvTargets: 폴더 안에서는 results.csv 만, 낱개 CSV는 파일명으로", () => {
  const { targets, skipped } = pickCsvTargets([
    "runs/R001_baseline/output/results.csv",
    "runs/R001_baseline/output/log.csv",
    "runs/R001_baseline/output/model.key",
    "R003_toepan_thickness_up.csv",
  ]);
  assert.deepStrictEqual([...targets.map(t => t.name)], ["baseline", "toepan thickness up"]);
  assert.strictEqual(skipped.length, 2);
});
test("samples/small_overlap_driver 10개 폴더 모두 파싱", () => {
  const dir = path.join(root, "samples", "small_overlap_driver");
  const folders = fs.readdirSync(dir).sort();
  assert.strictEqual(folders.length, 10);
  const runs = folders.map(f => {
    const rel = `${f}/output/results.csv`;
    const [t] = pickCsvTargets([rel]).targets;
    return parseCsv(fs.readFileSync(path.join(dir, rel), "utf8"), rel, t.name);
  });
  assert.deepStrictEqual(runs.map(r => r.runId), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  runs.forEach(r => assert.deepStrictEqual([...r.warnings], [], r.fileName));
  assert.strictEqual(runs[7].name, "lightweight floor");
  // run 8: toepan 322 mm(Poor) → lower 는 최악값 제한으로 Marginal
  assert.deepStrictEqual({ ...rateRun(runs[7]) }, { lower: M, upper: A, overall: M });
});

// ----- 시험 3종: 조수석 small overlap (Figure A-4), Moderate overlap 2.0 (Figure 7) -----
const P_ = PROTOCOLS.so_passenger, MO = PROTOCOLS.mo2;
const loadDir = (dir, protocol) => fs.readdirSync(path.join(root, "samples", dir)).sort().map(f => {
  const rel = `${f}/output/results.csv`;
  const [t] = pickCsvTargets([rel]).targets;
  return parseCsv(fs.readFileSync(path.join(root, "samples", dir, rel), "utf8"), rel, t.name, protocol);
});
const thresholds = p => Object.fromEntries(p.locations.map(l => [l.key, [...l.t]]));

test("조수석 기준값 = Figure A-4 (cm ×10), lower 5개 / upper 4개", () => {
  assert.deepStrictEqual(thresholds(P_), {
    lower_hinge_pillar: [150, 225, 300], footrest: [150, 225, 300], right_toepan: [150, 225, 300], center_toepan: [150, 225, 300],
    rocker_lat: [50, 100, 150],
    center_dash: [75, 125, 175], upper_hinge_pillar: [75, 125, 175], upper_dash: [75, 125, 175], right_lower_dash: [75, 125, 175],
  });
  assert.strictEqual(P_.locations.filter(l => l.group === "lower").length, 5);
  assert.strictEqual(P_.locations.filter(l => l.group === "upper").length, 4);
});
test("MO 2.0 기준값 = Figure 7 (cm ×10), 구조 단일 그룹", () => {
  assert.deepStrictEqual(thresholds(MO), {
    footrest: [150, 225, 300], left_toepan: [150, 225, 300], center_toepan: [150, 225, 300], right_toepan: [150, 225, 300],
    brake_pedal: [150, 225, 300], left_ip: [50, 100, 150], right_ip: [50, 100, 150], door_opening: [50, 100, 150],
  });
  assert.deepStrictEqual([...MO.groups.map(g => g.key)], ["structure"]);
});
test("MO 2.0: Left IP 하나만 Poor 이고 나머지 Good 이면 Marginal (가이드라인 예시)", () => {
  const values = Object.fromEntries(MO.locations.map(l => [l.key, 10]));
  values.left_ip = 160;
  assert.deepStrictEqual({ ...rateRun({ values }, MO) }, { structure: M, overall: M });
});
test("MO 2.0: Toepan 은 X 가 전방(음수)이면 Y-Z 합성, IP 는 후방 X 만", () => {
  const csv = "run_id,location,point,dx_mm,dy_mm,dz_mm,resultant_mm\n" +
              "1,Right_Toepan,1,-20,30,40,53.85\n1,Left_Toepan,1,60,30,40,78.1\n1,Left_Instrument_Panel,1,18,5.4,4.5,19.32\n";
  const run = parseCsv(csv, "x.csv", "x", MO);
  close(run.values.right_toepan, 50);    // √(30² + 40²)
  close(run.values.left_toepan, 78.1);   // X 후방 → X-Y-Z 합성 그대로
  close(run.values.left_ip, 18);         // dx
});
test("samples/small_overlap_passenger 6개 판정", () => {
  const runs = loadDir("small_overlap_passenger", P_);
  runs.forEach(r => assert.deepStrictEqual([...r.warnings], [], r.fileName));
  close(runs[2].values.right_toepan, 150);   // run 3: 경계값 150 → Good
  assert.deepStrictEqual(runs.map(r => ({ ...rateRun(r, P_) })), [
    { lower: G, upper: A, overall: A },   // 1 baseline: upper G,A,G,A 동률 → A
    { lower: G, upper: G, overall: G },
    { lower: G, upper: A, overall: A },   // 3: upper A,A,A,M → A
    { lower: A, upper: A, overall: A },   // 4: lower G,G,M,A,A → G/A 동률 → A
    { lower: M, upper: M, overall: M },   // 5: lower 최악 Poor → M, upper A/M 동률 → M
    { lower: G, upper: G, overall: G },
  ]);
});
test("samples/moderate_overlap_2 6개 판정", () => {
  const runs = loadDir("moderate_overlap_2", MO);
  runs.forEach(r => assert.deepStrictEqual([...r.warnings], [], r.fileName));
  close(runs[4].values.right_toepan, 50);    // run 5: X 전방 → Y-Z
  assert.deepStrictEqual(runs.map(r => rateRun(r, MO).overall), [G, G, A, M, G, G]);
});
test("detectProtocol: 측정위치 이름으로 시험 구분 (현재 탭과 달라도)", () => {
  const first = dir => fs.readFileSync(path.join(root, "samples", dir, fs.readdirSync(path.join(root, "samples", dir)).sort()[0], "output", "results.csv"), "utf8");
  ["so_driver", "so_passenger", "mo2"].forEach(fallback => {
    assert.strictEqual(detectProtocol(csvLocationNames(first("small_overlap_driver")), fallback), "so_driver");
    assert.strictEqual(detectProtocol(csvLocationNames(first("small_overlap_passenger")), fallback), "so_passenger");
    assert.strictEqual(detectProtocol(csvLocationNames(first("moderate_overlap_2")), fallback), "mo2");
  });
  assert.strictEqual(detectProtocol([], "mo2"), "mo2");   // 판별 불가 → 현재 탭
});

// ----- 그래프 선택 (최대 3개, 칸 위치 고정) -----
test("toggleChart: 빈 칸 채우기, 최대 3개, 해제 후 같은 칸 재사용", () => {
  let s = [null, null, null];
  s = toggleChart(s, "1").slots; s = toggleChart(s, "2").slots; s = toggleChart(s, "3").slots;
  assert.deepStrictEqual([...s], ["1", "2", "3"]);
  const full = toggleChart(s, "4");
  assert.strictEqual(full.ok, false);
  assert.deepStrictEqual([...full.slots], ["1", "2", "3"]);
  s = toggleChart(s, "2").slots;                 // 2 해제 → 가운데 칸 비움 (1, 3 색 유지)
  assert.deepStrictEqual([...s], ["1", null, "3"]);
  s = toggleChart(s, "4").slots;
  assert.deepStrictEqual([...s], ["1", "4", "3"]);
  assert.deepStrictEqual([...removeFromChart(s, "1")], [null, "4", "3"]);
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
