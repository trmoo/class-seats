/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  화면 ① 자리 뽑기. 이 앱의 본체.
 */
import { h, 알림 } from '../lib/ui.js';
import { 섞기 } from '../lib/random.js';
import { 번호읽기 } from '../core/parse.js';
import { 쓰는자리, 앉히기, 구역, 자리이름 } from '../core/seats.js';
import { 회피배치, 겹침요약 } from '../core/avoid.js';
import * as 이력창고 from '../core/history.js';
import { 푸터 } from './help.js';

// 화면 상태. 탭을 벗어나면 사라진다(서버도 계정도 없다).
const 상태 = {
  열: 5,
  행: 6,
  없는자리: [],
  없는자리설정중: false,
  번호설정중: false,
  번호글: '',
  회피켬: false,
  배치: null,
  방금뽑음: false,
};

let 뿌리 = null;

export function 그리기(자리) {
  뿌리 = 자리;
  칠하기();
}

function 다시() {
  const y = window.scrollY;
  칠하기();
  window.scrollTo(0, y);
}

function 칠하기() {
  const 이력 = 이력창고.읽기();
  뿌리.replaceChildren(
    h('h2', { class: '화면제목' }, '🎯 자리 뽑기'),
    h('p', { class: '화면설명' }, '교실 크기를 맞추고 뽑기를 누르면 됩니다. 결과는 그대로 인쇄할 수 있습니다.'),
    조작판(이력),
    무대(),
    상태.배치 ? 결과요약(이력) : null,
    푸터(),
  );
}

// ── 조작판 ──────────────────────────────────────────────────
function 조작판(이력) {
  const 총자리 = 상태.열 * 상태.행 - 상태.없는자리.length;
  const 뽑는중 = !!상태.배치;

  return h(
    'section',
    { class: '패널 조작판' },
    h('h3', {}, '교실 만들기'),
    h(
      'div',
      { class: '줄' },
      슬라이더('열(가로)', '열', 1, 12),
      슬라이더('행(세로)', '행', 1, 12),
      h(
        'div',
        { class: '수치 보통', style: { flex: '0 0 auto', minWidth: '150px' } },
        h('div', { class: '값' }, String(총자리)),
        h('div', { class: '이름' }, '뽑을 자리 수'),
      ),
    ),

    h('div', { class: '줄', style: { marginTop: '16px' } },
      h('button', {
        class: 'btn' + (상태.번호설정중 ? ' on' : ''),
        disabled: 뽑는중,
        onClick: () => { 상태.번호설정중 = !상태.번호설정중; if (!상태.번호설정중) 상태.번호글 = ''; 다시(); },
      }, 상태.번호설정중 ? '번호 맞춤 해제' : '번호 맞춤 설정'),

      h('button', {
        class: 'btn' + (상태.없는자리설정중 ? ' on' : ''),
        disabled: 뽑는중,
        onClick: () => { 상태.없는자리설정중 = !상태.없는자리설정중; 다시(); },
      }, 상태.없는자리설정중 ? '자리 설정 완료' : '없는 자리 설정'),

      회피스위치(이력),
    ),

    상태.번호설정중 ? 번호칸() : null,
    상태.없는자리설정중
      ? h('div', { class: '안내' }, '아래 교실에서 쓰지 않는 자리를 눌러 주세요. 다시 누르면 되돌아옵니다.')
      : null,

    h('div', { class: '줄', style: { marginTop: '18px' } },
      뽑는중
        ? h('button', { class: 'btn lg primary', onClick: 뽑기 }, '🔄 다시 뽑기')
        : h('button', { class: 'btn lg primary', onClick: 뽑기 }, '🎲 뽑기!'),
      뽑는중 ? h('button', { class: 'btn', onClick: () => { 상태.배치 = null; 다시(); } }, '지우기') : null,
      뽑는중 ? h('button', { class: 'btn', onClick: () => window.print() }, '🖨 인쇄') : null,
    ),

    뽑는중
      ? h('div', { class: '안내 빨강' },
          '결과가 마음에 안 든다고 [다시 뽑기]를 거듭 누르면, 그 순간부터 무작위가 아니라 고르는 것이 됩니다. 학생들이 가장 예민하게 보는 부분입니다.')
      : null,

    이력관리(이력),
  );
}

function 슬라이더(이름, 열쇠, 최소, 최대) {
  return h(
    'div',
    { class: '칸' },
    h('label', { class: '라벨', for: '입력' + 열쇠 }, `${이름} — ${상태[열쇠]}개`),
    h('input', {
      type: 'range',
      id: '입력' + 열쇠,
      min: 최소,
      max: 최대,
      value: 상태[열쇠],
      disabled: !!상태.배치,
      onInput: (e) => {
        상태[열쇠] = Number(e.target.value);
        // 격자가 바뀌면 없는 자리 표시는 뜻이 달라지므로 지운다
        상태.없는자리 = [];
        다시();
      },
    }),
  );
}

function 번호칸() {
  const 읽은 = 번호읽기(상태.번호글);
  const 총자리 = 상태.열 * 상태.행 - 상태.없는자리.length;
  return h(
    'div',
    { style: { marginTop: '14px' } },
    h('div', { class: '칸' },
      h('label', { class: '라벨', for: '번호입력' }, '쓸 번호만 적기 (예: 1-5, 8, 11-13)'),
      h('input', {
        type: 'text',
        id: '번호입력',
        value: 상태.번호글,
        placeholder: '비워 두면 1번부터 차례로',
        style: { minWidth: '340px' },
        onInput: (e) => { 상태.번호글 = e.target.value; 번호안내갱신(); },
      }),
    ),
    h('div', { id: '번호안내', class: '라벨', style: { marginTop: '8px' } }, 번호안내글(읽은, 총자리)),
  );
}

function 번호안내글(읽은, 총자리) {
  if (!읽은.ok) return '⚠ ' + 읽은.오류;
  if (!읽은.목록.length) return `비어 있습니다. 1번부터 ${총자리}번까지 씁니다.`;
  const 맞나 = 읽은.목록.length === 총자리;
  return `${읽은.목록.length}개 — ${읽은.목록.slice(0, 12).join(', ')}${읽은.목록.length > 12 ? ' …' : ''}` +
    (맞나 ? '  ✅ 자리 수와 맞습니다' : `  ⚠ 자리는 ${총자리}개입니다`);
}

// 글자를 칠 때마다 화면 전체를 다시 그리면 글상자가 초점을 잃는다.
// 안내 문구 한 줄만 갈아 끼운다.
function 번호안내갱신() {
  const 칸 = document.getElementById('번호안내');
  if (!칸) return;
  const 총자리 = 상태.열 * 상태.행 - 상태.없는자리.length;
  칸.textContent = 번호안내글(번호읽기(상태.번호글), 총자리);
}

function 회피스위치(이력) {
  const 켜짐 = 상태.회피켬;
  return h(
    'label',
    { class: '스위치' + (켜짐 ? ' 켜짐' : '') },
    h('input', {
      type: 'checkbox',
      checked: 켜짐,
      disabled: !!상태.배치,
      onChange: (e) => { 상태.회피켬 = e.target.checked; 다시(); },
    }),
    `최근 짝·구역 피하기 (기억 ${이력.length}회)`,
  );
}

function 이력관리(이력) {
  return h(
    'details',
    { class: '더' },
    h('summary', {}, `📁 기억해 둔 지난 배치 ${이력.length}회 — 내보내기·불러오기`),
    h('div', {},
      h('p', { class: '라벨' },
        '이 브라우저 안에만 남습니다. 서버로 보내지 않고 이름도 받지 않습니다. ' +
        '다른 PC 나 교실 TV 에서 이어 쓰려면 파일로 내보내 옮기세요.'),
      h('div', { class: '줄' },
        h('button', { class: 'btn sm', onClick: 내보내기 }, '⬇ 파일로 내보내기'),
        h('label', { class: 'btn sm', style: { cursor: 'pointer' } }, '⬆ 파일 불러오기',
          h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: 불러오기 })),
        h('button', {
          class: 'btn sm',
          onClick: async () => {
            if (await 알림('기억을 지울까요?', '지난 배치 기록이 모두 사라집니다. 되돌릴 수 없습니다.', { 확인: '지우기', 취소: '그만두기' })) {
              이력창고.비우기();
              다시();
            }
          },
        }, '🗑 기억 지우기'),
      ),
      이력.length
        ? h('table', { class: '표', style: { marginTop: '12px' } },
            h('thead', {}, h('tr', {}, h('th', {}, '언제'), h('th', {}, '교실 크기'), h('th', {}, '앉은 사람'))),
            h('tbody', {}, ...이력.map((기록) =>
              h('tr', {},
                h('td', {}, (기록.때 || '').slice(0, 16).replace('T', ' ')),
                h('td', {}, `${기록.열}열 × ${기록.행}행`),
                h('td', {}, `${기록.배치.filter((v) => v != null).length}명`),
              ))),
          )
        : null,
    ),
  );
}

function 내보내기() {
  const 덩이 = new Blob([이력창고.내보내기글()], { type: 'application/json' });
  const 주소 = URL.createObjectURL(덩이);
  const a = h('a', { href: 주소, download: '자리이력.json' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(주소);
}

function 불러오기(e) {
  const 파일 = e.target.files?.[0];
  if (!파일) return;
  const 읽개 = new FileReader();
  읽개.onload = async () => {
    const 결과 = 이력창고.불러오기(String(읽개.result));
    await 알림(결과.ok ? '불러왔습니다' : '불러오지 못했습니다',
      결과.ok ? `지난 배치 ${결과.개수}회를 읽었습니다.` : 결과.오류);
    다시();
  };
  읽개.readAsText(파일);
}

// ── 교실 무대 ───────────────────────────────────────────────
function 무대() {
  const { 열, 행 } = 상태;
  const 격자 = h('div', {
    class: '격자',
    style: { gridTemplateColumns: `44px repeat(${열}, minmax(62px, 96px))` },
  });

  // 첫 줄: 열 번호
  격자.appendChild(h('div', { class: '머리칸' }, ''));
  for (let c = 0; c < 열; c++) 격자.appendChild(h('div', { class: '머리칸' }, String(c + 1)));

  for (let r = 0; r < 행; r++) {
    const 구 = 구역(r, 행);
    격자.appendChild(h('div', { class: '머리칸 ' + 구 }, String(r + 1)));
    for (let c = 0; c < 열; c++) {
      격자.appendChild(자리칸(r * 열 + c, r * 열 + c));
    }
  }

  return h(
    'section',
    { class: '무대' },
    h('div', { class: '교탁' }, '칠 판 · 교 탁'),
    격자,
    h('div', { class: '구역범례' },
      h('span', { style: { color: 'var(--앞구역)' } }, '■ 앞'),
      h('span', { style: { color: 'var(--중구역)' } }, '■ 중'),
      h('span', { style: { color: 'var(--뒤구역)' } }, '■ 뒤'),
      h('span', {}, '— 왼쪽 행 번호의 색이 구역입니다'),
    ),
  );
}

function 자리칸(인덱스, 순번) {
  const 없앤자리 = 상태.없는자리.includes(인덱스);
  const 번호 = 상태.배치 ? 상태.배치[인덱스] : null;

  if (없앤자리) {
    const 속성 = { class: '자리 빈칸', title: 자리이름(인덱스, 상태.열) + ' — 쓰지 않는 자리' };
    if (상태.없는자리설정중) {
      return h('button', { ...속성, class: '자리 빈칸 고를수있음', onClick: () => 자리토글(인덱스) }, '없음');
    }
    return h('div', 속성, '없음');
  }

  const 글 = 번호 != null ? String(번호) : '';
  const 속성 = {
    class: '자리' + (상태.방금뽑음 && 번호 != null ? ' 등장' : ''),
    style: 상태.방금뽑음 && 번호 != null ? { animationDelay: `${순번 * 22}ms` } : {},
    title: 자리이름(인덱스, 상태.열),
  };
  if (상태.없는자리설정중) {
    return h('button', { ...속성, class: 속성.class + ' 고를수있음', onClick: () => 자리토글(인덱스) }, 글 || '❌');
  }
  return h('div', 속성, 글);
}

function 자리토글(인덱스) {
  const i = 상태.없는자리.indexOf(인덱스);
  if (i === -1) 상태.없는자리.push(인덱스);
  else 상태.없는자리.splice(i, 1);
  다시();
}

// ── 뽑기 ────────────────────────────────────────────────────
async function 뽑기() {
  const 총자리 = 상태.열 * 상태.행 - 상태.없는자리.length;
  if (총자리 < 1) return 알림('자리가 없습니다', '자리를 하나 이상 남겨 주세요.');

  let 번호들;
  if (상태.번호설정중 && 상태.번호글.trim() !== '') {
    const 읽은 = 번호읽기(상태.번호글);
    if (!읽은.ok) return 알림('번호를 읽을 수 없습니다', 읽은.오류);
    if (읽은.목록.length !== 총자리) {
      return 알림('개수가 맞지 않습니다',
        `적어 주신 번호는 ${읽은.목록.length}개인데 자리는 ${총자리}개입니다.\n` +
        '번호를 고치거나, 없는 자리를 설정해 자리 수를 맞춰 주세요.');
    }
    번호들 = 읽은.목록;
  } else {
    번호들 = Array.from({ length: 총자리 }, (_, i) => i + 1);
  }

  const 이력 = 이력창고.읽기();
  상태.배치 = 상태.회피켬
    ? 회피배치(번호들, 상태.열, 상태.행, 상태.없는자리, 이력).배치
    : 앉히기(섞기(번호들), 상태.열, 상태.행, 상태.없는자리);

  이력창고.더하기(상태.열, 상태.행, 상태.배치);
  상태.없는자리설정중 = false;
  상태.방금뽑음 = true;
  다시();
  상태.방금뽑음 = false; // 다음에 다시 그릴 때는 연출을 반복하지 않는다
}

// ── 뽑은 뒤 요약 ────────────────────────────────────────────
function 결과요약(이력) {
  // 방금 넣은 것(0번)은 자기 자신이므로 빼고 견준다
  const 지난것 = 이력.slice(1);
  const 겹침 = 겹침요약(상태.배치, 상태.열, 상태.행, 지난것);

  if (겹침.이력없음) {
    return h('section', { class: '패널' },
      h('h3', {}, '이번 배치'),
      h('div', { class: '안내 파랑' },
        '이번이 첫 기록입니다. 다음 번부터 지난 배치와 얼마나 겹치는지 여기에 나옵니다.'));
  }

  return h(
    'section',
    { class: '패널' },
    h('h3', {}, `이번 배치가 지난 ${지난것.length}회와 겹친 정도`),
    h('div', { class: '수치판' },
      수치('다시 만난 짝', 겹침.짝, 겹침.짝 === 0 ? '좋음' : 겹침.짝 <= 2 ? '보통' : '나쁨'),
      수치('같은 자리', 겹침.자리, 겹침.자리 === 0 ? '좋음' : 겹침.자리 <= 2 ? '보통' : '나쁨'),
      수치('같은 구역', 겹침.구역, '보통'),
    ),
    h('div', { class: '안내' + (상태.회피켬 ? '' : ' 파랑') },
      상태.회피켬
        ? '지금은 겹침을 피해서 뽑았습니다. 그래서 이 값이 낮습니다. 대신 완전히 균등한 무작위는 아닙니다.'
        : '지금은 완전 무작위로 뽑았습니다. 겹침이 나오는 것이 정상입니다 — 왜 그런지는 공정성 실험실에서 볼 수 있습니다.'),
  );
}

function 수치(이름, 값, 등급) {
  return h('div', { class: '수치 ' + 등급 },
    h('div', { class: '값' }, String(값)),
    h('div', { class: '이름' }, 이름));
}
