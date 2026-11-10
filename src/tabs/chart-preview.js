/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  교탁용 자리배치표 미리보기 — 내려받을 워드 파일과 같은 모양을 화면에 그린다.
 *
 *  크기·차례·글자 크기는 모두 core/chartdoc.js 의 자리표배치() 가 정한 것을 그대로 쓴다.
 *  여기서는 단위만 바꾼다: 워드의 twip(1/1440 인치) → 화면 px(1/96 인치) = ÷15, 글자는 pt 그대로.
 *  종이 한 장(A4 가로)을 실제 크기로 그린 뒤 판의 너비에 맞게 통째로 줄인다(transform: scale).
 *  ⚠ 크기를 여기서 따로 셈하지 말 것 — 미리보기와 파일이 어긋난다.
 */
import { h } from '../lib/ui.js';
import { 자리표배치, 종이 } from '../core/chartdoc.js';

const px = (twip) => `${(twip / 15).toFixed(2)}px`;
const 종이가로 = 종이.쪽가로 / 15;
const 종이세로 = 종이.쪽세로 / 15;

// 조각들 → 글자. 줄 간격은 워드 파일처럼 가장 큰 글자의 1.3배 고정값.
function 글줄(조각들, 덧 = {}) {
  const 큰 = Math.max(8, ...조각들.map((x) => x.크기));
  return h('div', { class: '미리줄', style: { lineHeight: `${큰 * 1.3}pt`, ...덧 } },
    ...조각들.map((x) => h('span', { style: { fontSize: `${x.크기}pt`, fontWeight: x.굵게 ? '700' : '400' } }, x.글)));
}

export function 미리보기(설정) {
  const 배 = 자리표배치(설정);

  // ── 왼쪽: 인사말 · 자리 · 교탁 · 회장 · 날짜 ──
  const 왼쪽 = h('div', { class: '미리왼쪽', style: { width: px(배.왼쪽가로) } },
    ...배.인사줄.map((x, i) => 글줄([x], i === 배.인사줄.length - 1 ? { marginBottom: px(배.인사뒤) } : {})),
    자리표(배.자리),
    h('div', { style: { height: px(배.틈) } }),
    h('div', {
      class: '미리교탁',
      style: { width: px(배.교탁.가로), height: px(배.교탁.높이) },
    }, 글줄([배.교탁.조각])),
    h('div', { style: { height: px(배.틈) } }),
    ...배.아래글.map((x) => 글줄([x])),
  );

  const 본문 = 배.명렬
    ? h('div', { class: '미리본문 명렬있음' },
        왼쪽,
        h('div', { style: { width: px(배.명렬틈), flex: 'none' } }),
        명렬표(배.명렬))
    : h('div', { class: '미리본문' }, 왼쪽);

  const 종이판 = h('div', {
    class: '미리종이',
    style: { width: `${종이가로}px`, height: `${종이세로}px`, padding: px(종이.여백) },
  }, 본문);

  // 판의 너비에 맞춰 종이를 통째로 줄인다. 틀의 높이도 함께 줄여야 아래가 비지 않는다.
  const 틀 = h('div', { class: '미리틀' }, 종이판);
  const 맞추기 = () => {
    const k = Math.min(1, 틀.clientWidth / 종이가로) || 1;
    종이판.style.transform = `scale(${k})`;
    틀.style.height = `${종이세로 * k}px`;
  };
  // ① 화면에 붙은 직후 한 번 — 이 함수를 부른 쪽이 같은 흐름 안에서 틀을 화면에 붙이므로 마이크로태스크면 충분하다.
  //   (ResizeObserver 만 믿으면 창이 가려져 있을 때 높이 0 인 채로 남았다)
  // ② 그 뒤 판 너비가 바뀔 때마다.
  queueMicrotask(맞추기);
  if (typeof ResizeObserver === 'function') new ResizeObserver(맞추기).observe(틀);
  return 틀;
}

function 자리표(자리) {
  if (!자리.줄들.length) return 글줄([{ 글: '(자리가 없습니다)', 크기: 14 }]);
  return h('table', { class: '미리자리표', style: { width: px(자리.너비들.reduce((a, b) => a + b, 0)) } },
    h('colgroup', {}, ...자리.너비들.map((w) => h('col', { style: { width: px(w) } }))),
    h('tbody', {}, ...자리.줄들.map((줄) => h('tr', { style: { height: px(자리.줄높이) } },
      ...줄.map((c) => h('td', { class: c.테두리 ? '선' : '' }, c.조각.length ? 글줄(c.조각) : null))))));
}

function 명렬표(명렬) {
  return h('table', { class: '미리명렬', style: { width: px(명렬.번가로 + 명렬.이가로) } },
    h('colgroup', {}, h('col', { style: { width: px(명렬.번가로) } }), h('col', { style: { width: px(명렬.이가로) } })),
    h('tbody', {}, ...명렬.줄들.map((r) => h('tr', { class: (r.위 ? '위선 ' : '') + (r.아래 ? '아래선' : ''), style: { height: px(명렬.높이) } },
      ...r.칸들.map((c) => h('td', { colspan: c.합침 > 1 ? String(c.합침) : null }, 글줄(c.조각)))))));
}
