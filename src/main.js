/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  화면 셋을 왼쪽 사이드바로 오간다.
 */
import './style.css';
import { h, 화면시작 } from './lib/ui.js';
import { 그리기 as 뽑기화면 } from './tabs/pick.js';
import { 그리기 as 실험실화면 } from './tabs/fair.js';
import { 그리기 as 설명서화면 } from './tabs/help.js';

const 화면들 = [
  { 열쇠: 'pick', 이름: '자리 뽑기', 아이콘: '🎯', 그리기: 뽑기화면 },
  { 열쇠: 'fair', 이름: '공정성 실험실', 아이콘: '🔬', 그리기: 실험실화면 },
  { 열쇠: 'help', 이름: '설명서', 아이콘: '📖', 그리기: 설명서화면 },
];

const 사이드바 = document.getElementById('사이드바');
const 본문 = document.getElementById('본문');

function 지금화면() {
  const 열쇠 = location.hash.replace('#', '');
  return 화면들.find((s) => s.열쇠 === 열쇠) || 화면들[0];
}

function 사이드바그리기() {
  const 이번 = 지금화면();
  사이드바.replaceChildren(
    h('div', { class: 'brand' }, '🎲 자리 뽑기', h('small', {}, '교실 자리 배치 · 무작위 실험실')),
    ...화면들.map((s) =>
      h(
        'button',
        {
          class: 'nav-btn',
          'aria-current': s === 이번 ? 'true' : 'false',
          onClick: () => { location.hash = s.열쇠; },
        },
        h('span', { class: 'ico' }, s.아이콘),
        s.이름,
      ),
    ),
    h(
      'div',
      { class: 'side-foot' },
      '원작 © 2026 민준서',
      h('br'),
      '개작 © 2026 티쳐무',
      h('br'),
      '모든 권리 보유 · 학교 수업용',
    ),
  );
}

function 다시그리기() {
  화면시작(); // 앞 화면이 걸어 둔 타이머·리스너를 걷어 낸다
  const 이번 = 지금화면();
  사이드바그리기();
  본문.replaceChildren();
  이번.그리기(본문);
  본문.scrollTop = 0;
  window.scrollTo(0, 0);
  document.title = `${이번.이름} · 랜덤 자리 뽑기`;
}

window.addEventListener('hashchange', 다시그리기);
다시그리기();
