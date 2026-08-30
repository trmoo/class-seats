/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  화면을 만드는 잔손. 요소 만들기와 화면 수명 관리.
 */

// 요소 하나 만들기.
// ⚠ 자식 자리에 넣는 문자열은 글자 그대로 들어간다. 태그를 쓰려면 { html: '...' }.
export function h(태그, 속성 = {}, ...자식들) {
  const el = document.createElement(태그);
  for (const [k, v] of Object.entries(속성 || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of 자식들.flat(9)) {
    if (c == null || c === false || c === '') continue;
    el.appendChild(c?.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ── 화면 수명 관리 ───────────────────────────────────────────
// 탭을 옮기면 화면은 지워지지만 window 에 걸어 둔 리스너와 타이머는 살아남아
// 오갈 때마다 쌓인다. 새 화면을 그리기 직전에 여기서 걷어 낸다.
// ⚠ 탭 파일에서 window.addEventListener('resize', …) 나 setInterval 을 직접 쓰지 말 것.
let 리사이즈들 = [];
let 타이머들 = [];

export function 화면시작() {
  리사이즈들.forEach((f) => window.removeEventListener('resize', f));
  리사이즈들 = [];
  타이머들.forEach(clearInterval);
  타이머들 = [];
}

export function 창크기바뀔때(fn) {
  window.addEventListener('resize', fn);
  리사이즈들.push(fn);
}

export function 화면타이머(fn, ms) {
  const id = setInterval(fn, ms);
  타이머들.push(id);
  return id;
}

// ── 알림창 ───────────────────────────────────────────────────
// 브라우저 기본 alert 는 주소를 함께 보여 주어 교실 화면에 어울리지 않는다.
export function 알림(제목, 내용, { 확인 = '확인', 취소 = null } = {}) {
  return new Promise((resolve) => {
    const 닫기 = (값) => { 덮개.remove(); resolve(값); };
    const 단추들 = h('div', { class: 'modal-btns' },
      취소 && h('button', { class: 'btn', onClick: () => 닫기(false) }, 취소),
      h('button', { class: 'btn primary', onClick: () => 닫기(true) }, 확인),
    );
    const 상자 = h('div', { class: 'modal' }, h('h3', {}, 제목), h('p', {}, 내용), 단추들);
    const 덮개 = h('div', { class: 'overlay', onClick: (e) => { if (e.target === 덮개) 닫기(false); } }, 상자);
    document.body.appendChild(덮개);
    상자.querySelector('.primary').focus();
  });
}

// 스크롤 위치를 지키며 특정 영역만 다시 그린다.
export function 다시그리기(자리, 만들기) {
  const 스크롤 = 자리.scrollTop;
  자리.replaceChildren(만들기());
  자리.scrollTop = 스크롤;
}
