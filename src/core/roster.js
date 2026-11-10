/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  학생 명렬표 읽기 — 표(줄마다 칸 글자)에서 번호와 이름을 찾아낸다.
 *
 *  ★ 이름은 이 화면에서만 쓴다. localStorage·이력·내보내기 파일 어디에도 넣지 않는다.
 *    (tools/check-syntax.mjs 가 「명렬」 을 다루는 파일에서 저장소를 쓰지 못하게 막는다)
 *
 *  명렬표 모양은 학교마다 다르므로 머리글을 찾아 읽는다.
 *   - 번호 칸: 「번호」「출석번호」「번」 … 없으면 「학번」 의 끝 두 자리
 *   - 이름 칸: 「이름」「성명」「학생명」 …
 *   - 비고 칸(있으면): 「비고」「학적」「상태」 …  — 전출·자퇴 같은 말이 있으면 재적에서 뺀다
 *   - 머리글이 없으면 「숫자가 많은 칸」 과 「글자가 많은 칸」 을 짐작한다.
 */

const 번호머리 = /^(출석\s*)?번호$|^번$|^no\.?$/i;
const 학번머리 = /^학번$/;
const 이름머리 = /^(이름|성명|성\s*명|학생\s*(이름|명|성명)|학생명)$/;
const 비고머리 = /^(비고|학적|학적\s*(변동|상태)|상태|변동|메모)$/;
// 재적에서 빼는 말. 「(전출)」 처럼 이름 칸에 함께 적혀 있어도 알아본다.
const 빠짐말 = /(전출|전학|자퇴|퇴학|휴학|유예|면제|제적|사망|학업\s*중단)/;

const 다듬기 = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// 시트 여러 장 가운데 명렬표처럼 보이는 첫 장을 읽는다.
export function 명렬표찾기(시트들) {
  let 첫실패 = null;
  for (const 시트 of 시트들) {
    const 결과 = 명렬표읽기(시트.줄들);
    if (결과.ok) return { ...결과, 시트: 시트.이름 };
    첫실패 ??= 결과;
  }
  return 첫실패 || { ok: false, 오류: '표가 비어 있습니다.' };
}

export function 명렬표읽기(줄들) {
  const 표 = 줄들.map((줄) => (줄 || []).map(다듬기));
  const 머리 = 머리글찾기(표);
  const 칸 = 머리 || 짐작하기(표);
  if (!칸) {
    return {
      ok: false,
      오류: "번호와 이름이 있는 칸을 찾지 못했습니다.\n첫 줄에 '번호', '이름' 머리글을 적어 두면 확실하게 읽습니다.",
    };
  }

  const 학생 = [];
  const 경고 = [];
  const 본번호 = new Map();
  for (let r = 칸.시작; r < 표.length; r++) {
    const 줄 = 표[r];
    const 번호 = 번호읽기(줄[칸.번호], 칸.학번);
    let 이름 = 줄[칸.이름] || '';
    if (번호 == null || !이름) continue;
    if (번호머리.test(이름) || 이름머리.test(이름)) continue; // 중간에 머리글이 또 있는 표

    let 비고 = 칸.비고 != null ? 줄[칸.비고] || '' : '';
    // 이름 칸에 「김가온 (전출)」 처럼 적혀 있으면 괄호를 비고로 옮긴다
    const 괄호 = 이름.match(/^(.*?)\s*[(（]\s*([^)）]*)\s*[)）]\s*$/);
    if (괄호 && 빠짐말.test(괄호[2])) {
      이름 = 괄호[1].trim();
      비고 = [비고, 괄호[2].trim()].filter(Boolean).join(' ');
    }
    const 재적 = !빠짐말.test(비고);

    if (본번호.has(번호)) {
      경고.push(`${번호}번이 두 번 있습니다 (${본번호.get(번호)} · ${이름}). 앞의 것만 씁니다.`);
      continue;
    }
    본번호.set(번호, 이름);
    학생.push({ 번호, 이름, 비고: 빠짐말.exec(비고)?.[1] || 비고, 재적 });
  }

  if (!학생.length) return { ok: false, 오류: '번호와 이름이 함께 적힌 줄이 하나도 없습니다.' };
  학생.sort((a, b) => a.번호 - b.번호);
  return { ok: true, 학생, 경고 };
}

function 번호읽기(칸, 학번인가) {
  const s = String(칸 ?? '').replace(/번$/, '').trim();
  if (!/^\d+(\.0+)?$/.test(s)) return null;
  let n = Math.round(Number(s));
  if (학번인가) n %= 100; // 학번 20315 → 15번
  return n >= 1 && n <= 99 ? n : null;
}

function 머리글찾기(표) {
  for (let r = 0; r < Math.min(표.length, 20); r++) {
    const 줄 = 표[r];
    let 번호 = 줄.findIndex((c) => 번호머리.test(c));
    let 학번 = false;
    if (번호 < 0) { 번호 = 줄.findIndex((c) => 학번머리.test(c)); 학번 = 번호 >= 0; }
    const 이름 = 줄.findIndex((c) => 이름머리.test(c));
    if (번호 < 0 || 이름 < 0) continue;
    const 비고 = 줄.findIndex((c) => 비고머리.test(c));
    return { 시작: r + 1, 번호, 이름, 비고: 비고 >= 0 ? 비고 : null, 학번 };
  }
  return null;
}

// 머리글이 없는 표 — 1~99 정수가 가장 많은 칸을 번호로, 그 오른쪽에서 글자가 가장 많은 칸을 이름으로 본다.
function 짐작하기(표) {
  const 열수 = Math.max(0, ...표.map((줄) => 줄.length));
  let 번호 = -1;
  let 최고 = 2; // 적어도 세 줄은 번호여야 믿는다
  for (let c = 0; c < 열수; c++) {
    const 셈 = 표.filter((줄) => 번호읽기(줄[c], false) != null).length;
    if (셈 > 최고) { 최고 = 셈; 번호 = c; }
  }
  if (번호 < 0) return null;
  const 글자칸 = (c) => 표.filter((줄) => 번호읽기(줄[번호], false) != null && /[가-힣A-Za-z]/.test(줄[c] || '')).length;
  let 이름 = -1;
  let 이름셈 = 0;
  for (let c = 0; c < 열수; c++) {
    if (c === 번호) continue;
    const 셈 = 글자칸(c) - (c < 번호 ? 0.5 : 0); // 같은 셈이면 번호 오른쪽 칸을 고른다
    if (셈 > 이름셈) { 이름셈 = 셈; 이름 = c; }
  }
  if (이름 < 0) return null;
  return { 시작: 0, 번호, 이름, 비고: null, 학번: false };
}

// ── 자리표에 쓰는 도우미 ───────────────────────────────────────
// 자리 칸에는 괄호 속 덧붙임(영문 이름 등)을 빼고 적는다. 명렬 칸에는 다 적는다.
export function 자리이름표(이름) {
  const 짧은 = 이름.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return 짧은 || 이름;
}

// [1,2,3,5,7,8] → "1-3, 5, 7-8"  (번호 맞춤 설정 칸에 그대로 넣을 수 있는 모양)
export function 번호범위글(번호들) {
  const 정렬 = [...new Set(번호들)].sort((a, b) => a - b);
  const 조각 = [];
  for (let i = 0; i < 정렬.length; i++) {
    let j = i;
    while (j + 1 < 정렬.length && 정렬[j + 1] === 정렬[j] + 1) j++;
    조각.push(i === j ? String(정렬[i]) : `${정렬[i]}-${정렬[j]}`);
    i = j;
  }
  return 조각.join(', ');
}

// 뽑은 배치와 명렬표를 맞대어 본다. 자리표를 내기 전에 사람이 꼭 봐야 할 것들.
export function 맞대기(배치, 학생) {
  const 번호표 = new Map(학생.map((s) => [s.번호, s]));
  const 앉은 = new Set((배치 || []).filter((v) => v != null));
  const 알림들 = [];

  const 이름없음 = [...앉은].filter((n) => !번호표.has(n)).sort((a, b) => a - b);
  if (이름없음.length) {
    알림들.push(`명렬표에 없는 번호가 자리에 있습니다: ${이름없음.join(', ')}번 — 그 자리에는 번호만 적힙니다.`);
  }
  for (const s of 학생) {
    if (!s.재적 && 앉은.has(s.번호)) 알림들.push(`${s.번호}번 ${s.이름}(${s.비고}) 학생에게 자리가 있습니다.`);
  }
  const 자리없음 = 학생.filter((s) => s.재적 && !앉은.has(s.번호));
  if (자리없음.length) {
    알림들.push(`자리가 없는 학생이 있습니다: ${자리없음.map((s) => `${s.번호}번 ${s.이름}`).join(', ')}`);
  }
  return 알림들;
}
