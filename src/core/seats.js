/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  교실 격자 모델. 자리는 0부터 세는 인덱스로 다룬다 (인덱스 = 행 * 열수 + 열).
 */

// 인덱스를 행·열 번호(0부터)로 되돌린다.
export function 행열(인덱스, 열수) {
  return { 행: Math.floor(인덱스 / 열수), 열: 인덱스 % 열수 };
}

// 사람이 읽는 자리 이름. "3행 2열"
export function 자리이름(인덱스, 열수) {
  const { 행, 열 } = 행열(인덱스, 열수);
  return `${행 + 1}행 ${열 + 1}열`;
}

// 앞·중·뒤 세 구역 가운데 어디인가.
// 교탁이 1행 쪽에 있다고 본다. 행 수를 3등분해 나눈다.
export function 구역(행번호, 행수) {
  if (행수 <= 2) return 행번호 === 0 ? '앞' : '뒤';
  const 칸 = 행수 / 3;
  if (행번호 < 칸) return '앞';
  if (행번호 < 칸 * 2) return '중';
  return '뒤';
}

// 실제로 쓰는 자리(없는 자리를 뺀) 인덱스 목록.
export function 쓰는자리(열, 행, 없는자리 = []) {
  const 뺄것 = new Set(없는자리);
  const 목록 = [];
  for (let i = 0; i < 열 * 행; i++) if (!뺄것.has(i)) 목록.push(i);
  return 목록;
}

// 배치에서 "좌우로 붙어 앉은 번호쌍"을 뽑아낸다.
// 배치[자리인덱스] = 번호, 없는 자리는 null.
// 가운데가 빈 자리면 짝으로 보지 않는다(실제로 떨어져 앉으므로).
export function 짝목록(배치, 열, 행) {
  const 결과 = [];
  for (let r = 0; r < 행; r++) {
    for (let c = 0; c < 열 - 1; c++) {
      const a = 배치[r * 열 + c];
      const b = 배치[r * 열 + c + 1];
      if (a == null || b == null) continue;
      결과.push(a < b ? [a, b] : [b, a]);
    }
  }
  return 결과;
}

// 짝쌍을 Set 에 담기 좋은 문자열 열쇠로.
export function 짝열쇠([a, b]) {
  return `${a}-${b}`;
}

// 번호별로 어느 구역에 앉았는지. { 3: '앞', 7: '뒤', ... }
export function 구역표(배치, 열, 행) {
  const 표 = {};
  for (let i = 0; i < 배치.length; i++) {
    if (배치[i] == null) continue;
    표[배치[i]] = 구역(Math.floor(i / 열), 행);
  }
  return 표;
}

// 번호 목록을 자리에 순서대로 앉힌다. 없는 자리는 null 로 남긴다.
export function 앉히기(번호들, 열, 행, 없는자리 = []) {
  const 뺄것 = new Set(없는자리);
  const 배치 = new Array(열 * 행).fill(null);
  let k = 0;
  for (let i = 0; i < 열 * 행; i++) {
    if (뺄것.has(i)) continue;
    배치[i] = 번호들[k] ?? null;
    k++;
  }
  return 배치;
}
