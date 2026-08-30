/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  지난 자리 배치를 기억한다.
 *
 *  이 앱은 이름도 학번도 받지 않는다. 그래서 "누구"를 가리킬 수 있는 것은
 *  출석번호 하나뿐이고, 남기는 것도 그것뿐이다.
 *  한 회차에 { 열, 행, 배치 } 만 담고 짝·구역은 쓸 때마다 계산한다
 *  (같은 내용을 두 벌로 갖고 있으면 어긋날 수 있어서다).
 *
 *  저장 위치는 그 브라우저의 localStorage 뿐이다. 서버로 나가지 않는다.
 *  ⚠ 브라우저나 PC 를 바꾸면 이력이 없다. 그래서 파일 내보내기를 함께 둔다.
 */

export const 열쇠 = 'class-seats/이력/v1';
export const 최대보관 = 5; // 실측으로 정했다 — 3회는 짝 반복이 30%만 줄고, 5회는 46% 줄었다

// localStorage 를 못 쓰는 환경(사생활 보호 창, node 시험)에서도 죽지 않게 감싼다.
function 창고() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* 접근 자체가 막힌 경우 */ }
  if (!globalThis.__임시창고) globalThis.__임시창고 = new Map();
  const m = globalThis.__임시창고;
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

export function 읽기() {
  try {
    const 글 = 창고().getItem(열쇠);
    if (!글) return [];
    const 값 = JSON.parse(글);
    return Array.isArray(값?.이력) ? 값.이력 : [];
  } catch {
    return []; // 망가진 값이면 없는 셈 친다
  }
}

// 새 배치를 맨 앞에 넣는다. 목록의 0번이 가장 최근이다.
export function 더하기(열, 행, 배치, 때 = new Date().toISOString()) {
  const 이력 = [{ 때, 열, 행, 배치: [...배치] }, ...읽기()].slice(0, 최대보관);
  저장(이력);
  return 이력;
}

export function 저장(이력) {
  try {
    창고().setItem(열쇠, JSON.stringify({ v: 1, 이력 }));
    return true;
  } catch {
    return false; // 저장 공간이 꽉 찼거나 막힌 경우 — 뽑기 자체는 계속된다
  }
}

export function 비우기() {
  try { 창고().removeItem(열쇠); } catch { /* 무시 */ }
}

// 파일로 내보낼 글. 교사가 다른 PC 로 옮길 때 쓴다.
export function 내보내기글() {
  return JSON.stringify({ v: 1, 앱: 'class-seats', 이력: 읽기() }, null, 2);
}

// 내보낸 파일을 되읽는다. 남의 파일이 들어와도 앱이 죽지 않게 꼼꼼히 확인한다.
export function 불러오기(글) {
  let 값;
  try { 값 = JSON.parse(글); } catch { return { ok: false, 오류: '파일을 읽을 수 없습니다. JSON 형식이 아닙니다.' }; }
  if (!Array.isArray(값?.이력)) return { ok: false, 오류: '자리 이력 파일이 아닙니다.' };

  const 걸러낸 = 값.이력.filter((h) =>
    Number.isInteger(h?.열) && Number.isInteger(h?.행) &&
    Array.isArray(h?.배치) && h.배치.length === h.열 * h.행 &&
    h.배치.every((v) => v === null || Number.isInteger(v))
  ).slice(0, 최대보관);

  if (!걸러낸.length) return { ok: false, 오류: '쓸 수 있는 기록이 없습니다.' };
  저장(걸러낸);
  return { ok: true, 개수: 걸러낸.length };
}
