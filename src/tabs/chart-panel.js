/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  자리 뽑기 화면의 「교탁용 자리배치표」 판.
 *  명렬표(엑셀·CSV)를 넣으면 뽑은 자리에 이름을 붙여 워드 파일(.docx)로 내려받는다.
 *
 *  ★ 명렬표의 이름은 이 파일의 변수(판.명렬)에만 머문다.
 *    localStorage·sessionStorage·이력·내보내기 파일 어디에도 넣지 않는다 — 새로 고치면 사라진다.
 *    tools/check-syntax.mjs ⑧ 이 이 파일에서 저장소를 쓰지 못하게 막는다.
 *
 *  ⚠ 글상자에 칠 때마다 화면 전체를 다시 그리지 않는다(초점이 날아간다).
 *    값만 판에 담고, 미리보기 칸 하나만 갈아 끼운다(미리보기갱신).
 */
import { h, 알림 } from '../lib/ui.js';
import { 표읽기 } from '../lib/sheet.js';
import { 명렬표찾기, 번호범위글, 맞대기 } from '../core/roster.js';
import { 자리표문서, 오늘글, 자리표파일이름 } from '../core/chartdoc.js';
import { 미리보기 } from './chart-preview.js';

// 지금 그려진 자리 뽑기 화면의 상태. 미리보기를 갈아 끼울 때 쓴다.
let 지금상태 = null;

const 판 = {
  명렬: null, // { 학생, 경고, 시트, 파일 }
  반: '',
  담임: '',
  회장: '',
  부회장: '',
  날짜: 오늘글(),
  인사말: '',
  인사말손댐: false,
  각주: '',
  각주손댐: false,
  빈책상: false,
  빈책상글: '(이동수업용)',
  명렬칸: true,
  번호붙이기: false,
};

function 기본인사말() {
  const 반 = 판.반.trim() || '우리 반';
  const 담임 = 판.담임.trim();
  return `${반}에 들어오시는 교과 담당 선생님 항상 감사합니다.\n` +
    `무단 자리 이동, 수업 방해 또는 미참여 학생이 있다면 말씀해 주세요.${담임 ? ` - 담임 ${담임} 올림 -` : ''}`;
}

// 반·담임을 고치면, 사람이 손대지 않은 인사말은 따라 바뀐다
function 인사말따라가기() {
  if (판.인사말손댐) return;
  판.인사말 = 기본인사말();
  const 칸 = document.getElementById('자리표인사말');
  if (칸) 칸.value = 판.인사말;
}

// 워드 파일과 미리보기가 똑같은 설정을 쓰도록 한 곳에서 만든다.
// 아직 뽑기 전이면 자리마다 0(빈 자리 칸)을 넣어 교실 모양만 보여 준다.
function 문서설정(상태) {
  const 배치 = 상태.배치 ||
    Array.from({ length: 상태.열 * 상태.행 }, (_, i) => (상태.없는자리.includes(i) ? null : 0));
  return {
    열: 상태.열,
    행: 상태.행,
    배치,
    학생: 판.명렬?.학생 || null,
    인사말: 판.인사말,
    반: 판.반,
    담임: 판.담임,
    회장: 판.회장,
    부회장: 판.부회장,
    날짜: 판.날짜,
    빈책상: 판.빈책상,
    빈책상글: 판.빈책상글,
    명렬칸: 판.명렬칸,
    번호붙이기: 판.번호붙이기,
    각주: 판.각주,
  };
}

function 미리보기칸(상태) {
  return h('div', { id: '자리표미리' }, 미리보기(문서설정(상태)));
}

// 글자를 칠 때마다 부른다 — 판 전체가 아니라 미리보기 한 칸만 새로 그린다.
function 미리보기갱신() {
  const 칸 = document.getElementById('자리표미리');
  if (칸 && 지금상태) 칸.replaceChildren(미리보기(문서설정(지금상태)));
}

export function 자리표판({ 상태, 다시 }) {
  지금상태 = 상태;
  if (!판.인사말손댐) 판.인사말 = 기본인사말();
  const 명렬 = 판.명렬;

  return h(
    'section',
    { class: '패널 자리표판' },
    h('h3', {}, '🖨 교탁에 둘 자리배치표 — 워드 파일로'),
    h('p', { class: '라벨', style: { marginTop: '0' } },
      '학생 명렬표(엑셀 .xlsx 또는 .csv)를 넣으면 뽑은 자리에 이름을 붙여 ',
      h('b', {}, '교사 시점(교탁이 아래)'),
      ' 자리배치표를 워드 파일(.docx)로 만듭니다. 한글·구글 문서에서도 열립니다.'),
    h('div', { class: '안내 파랑' },
      '🔒 명렬표는 이 화면 안에서만 읽습니다. 서버로 보내지 않고 이 브라우저에도 저장하지 않습니다 — ' +
      '새로 고치면 사라집니다. 「지난 배치 기억」에는 지금처럼 번호만 남습니다.'),

    h('div', { class: '줄', style: { marginTop: '14px' } },
      h('label', { class: 'btn', style: { cursor: 'pointer' } }, 명렬 ? '📂 명렬표 바꾸기' : '📂 명렬표 넣기',
        h('input', {
          type: 'file',
          accept: '.xlsx,.csv,.txt,.xls',
          style: { display: 'none' },
          onChange: (e) => 명렬표넣기(e, 다시),
        })),
      명렬 ? h('button', { class: 'btn sm', onClick: () => { 판.명렬 = null; 다시(); } }, '명렬표 빼기') : null,
      명렬
        ? h('button', {
            class: 'btn sm',
            disabled: !!상태.배치,
            title: 상태.배치 ? '번호를 바꾸려면 위의 [지우기] 를 먼저 눌러 주세요' : '',
            onClick: () => 번호맞추기(상태, 다시),
          }, `🔢 번호 맞춤을 명렬표대로 (${번호범위글(명렬.학생.filter((s) => s.재적).map((s) => s.번호))})`)
        : null,
    ),
    명렬 ? 명렬요약(명렬) : h('p', { class: '라벨' },
      "명렬표 첫 줄에 '번호'·'이름' 머리글이 있으면 가장 확실합니다. 「학번」만 있으면 끝 두 자리를 번호로 씁니다. " +
      '비고 칸이나 이름 옆에 (전출)·(자퇴)가 있으면 재적에서 뺍니다.'),
    명렬 && 상태.배치 ? 맞대기안내(상태, 명렬) : null,

    h('details', { class: '더', open: true },
      h('summary', {}, '✏️ 자리표에 들어갈 글 고치기 — 반 · 담임 · 회장 · 날짜 · 인사말'),
      h('div', {},
        h('div', { class: '줄' },
          글칸('학년·반', '반', '예: 2학년 2반', 인사말따라가기),
          글칸('담임', '담임', '예: 홍길동', 인사말따라가기),
          글칸('회장', '회장', '비워 두면 줄이 빠집니다'),
          글칸('부회장', '부회장', ''),
          글칸('날짜', '날짜', '예: 2026.11.10.~'),
        ),
        h('div', { class: '칸', style: { marginTop: '12px' } },
          h('label', { class: '라벨', for: '자리표인사말' }, '맨 위 인사말 (두 줄)'),
          h('textarea', {
            id: '자리표인사말',
            rows: 3,
            onInput: (e) => { 판.인사말 = e.target.value; 판.인사말손댐 = true; 미리보기갱신(); },
          }, 판.인사말),
        ),
        h('div', { class: '줄', style: { marginTop: '12px' } },
          고르기('빈책상', '없는 자리를 빈 책상으로 그리기'),
          글칸('빈 책상에 적을 글', '빈책상글', '비워 둬도 됩니다'),
        ),
        h('div', { class: '줄', style: { marginTop: '12px' } },
          고르기('명렬칸', '오른쪽에 명렬 함께 넣기'),
          고르기('번호붙이기', '이름 앞에 번호 작게 붙이기'),
          글칸('명렬 아래 각주', '각주', '예: (*: 통합교육지원반)', () => { 판.각주손댐 = true; }),
        ),
        h('p', { class: '라벨' },
          '모든 행이 비어 있는 열은 통로로 보고 좁은 틈으로 그립니다. 화면의 1열이 종이의 맨 왼쪽, 1행이 교탁 바로 앞(맨 아래)입니다.'),
      ),
    ),

    h('div', { class: '미리안내' },
      h('b', {}, '👀 미리보기'),
      h('span', { class: '라벨' },
        상태.배치
          ? '내려받을 워드 파일과 같은 모양입니다. 위 칸을 고치거나 고르면 바로 바뀝니다.'
          : '아직 뽑기 전이라 자리 칸이 비어 있습니다. 위 칸을 고치거나 고르면 바로 바뀝니다.'),
    ),
    미리보기칸(상태),
    h('p', { class: '라벨', style: { margin: '8px 0 0' } },
      '글꼴은 컴퓨터와 프로그램(워드·한글)에 따라 조금 다르게 보일 수 있습니다.'),

    h('div', { class: '줄', style: { marginTop: '16px' } },
      h('button', {
        class: 'btn lg primary',
        disabled: !상태.배치,
        onClick: () => 내려받기(상태),
      }, '📄 워드 파일 내려받기'),
      상태.배치 ? null : h('span', { class: '라벨' }, '먼저 [🎲 뽑기!] 를 해 주세요.'),
      상태.배치 && !명렬 ? h('span', { class: '라벨' }, '명렬표가 없으면 자리에 번호만 적힙니다.') : null,
    ),
  );
}

function 글칸(이름, 열쇠, 보기, 바뀔때) {
  const id = '자리표' + 열쇠;
  return h('div', { class: '칸' },
    h('label', { class: '라벨', for: id }, 이름),
    h('input', {
      type: 'text',
      id,
      value: 판[열쇠],
      placeholder: 보기,
      onInput: (e) => { 판[열쇠] = e.target.value; 바뀔때?.(); 미리보기갱신(); },
    }));
}

function 고르기(열쇠, 이름) {
  return h('label', { class: '스위치' + (판[열쇠] ? ' 켜짐' : '') },
    h('input', {
      type: 'checkbox',
      checked: 판[열쇠],
      onChange: (e) => {
        판[열쇠] = e.target.checked;
        e.target.parentElement.classList.toggle('켜짐', 판[열쇠]);
        미리보기갱신();
      },
    }),
    이름);
}

function 명렬요약(명렬) {
  const 재적 = 명렬.학생.filter((s) => s.재적);
  const 빠짐 = 명렬.학생.filter((s) => !s.재적);
  return h('div', {},
    h('div', { class: '안내' },
      `📋 ${명렬.파일}${명렬.시트 && 명렬.시트 !== 명렬.파일 ? ` (${명렬.시트} 시트)` : ''} — ${명렬.학생.length}명을 읽었습니다. ` +
      `재적 ${재적.length}명` + (빠짐.length ? ` · ${빠짐.map((s) => `${s.번호}번 ${s.비고}`).join(', ')}` : '')),
    ...명렬.경고.map((글) => h('div', { class: '안내 빨강' }, '⚠ ' + 글)),
    h('details', { class: '더' },
      h('summary', {}, '읽은 명렬 보기'),
      h('table', { class: '표' },
        h('thead', {}, h('tr', {}, h('th', {}, '번호'), h('th', { style: { textAlign: 'left' } }, '이름'), h('th', {}, '재적'))),
        h('tbody', {}, ...명렬.학생.map((s) => h('tr', {},
          h('td', {}, String(s.번호)),
          h('td', { style: { textAlign: 'left' } }, s.이름),
          h('td', {}, s.재적 ? '○' : s.비고)))))),
  );
}

function 맞대기안내(상태, 명렬) {
  const 알림들 = 맞대기(상태.배치, 명렬.학생);
  if (!알림들.length) {
    const 수 = 상태.배치.filter((v) => v != null).length;
    return h('div', { class: '안내 파랑' }, `✅ 자리 ${수}개와 명렬표 재적 ${수}명이 꼭 맞습니다.`);
  }
  return h('div', {}, ...알림들.map((글) => h('div', { class: '안내 빨강' }, '⚠ ' + 글)));
}

async function 명렬표넣기(e, 다시) {
  const 파일 = e.target.files?.[0];
  e.target.value = ''; // 같은 파일을 다시 골라도 읽히게
  if (!파일) return;
  try {
    const 시트들 = await 표읽기(파일.name, new Uint8Array(await 파일.arrayBuffer()));
    const 결과 = 명렬표찾기(시트들);
    if (!결과.ok) return 알림('명렬표를 읽지 못했습니다', 결과.오류);
    판.명렬 = { 학생: 결과.학생, 경고: 결과.경고, 시트: 결과.시트, 파일: 파일.name };
    if (!판.각주손댐) 판.각주 = 결과.학생.some((s) => s.이름.includes('*')) ? '(*: 통합교육지원반)' : '';
    다시();
  } catch (오류) {
    알림('명렬표를 읽지 못했습니다', 오류.message || String(오류));
  }
}

async function 번호맞추기(상태, 다시) {
  const 번호들 = 판.명렬.학생.filter((s) => s.재적).map((s) => s.번호);
  상태.번호설정중 = true;
  상태.번호글 = 번호범위글(번호들);
  const 총자리 = 상태.열 * 상태.행 - 상태.없는자리.length;
  다시();
  if (번호들.length !== 총자리) {
    await 알림('자리 수를 맞춰 주세요',
      `번호 맞춤을 「${상태.번호글}」 로 바꿨습니다 (재적 ${번호들.length}명).\n` +
      `지금 자리는 ${총자리}개라 그대로는 뽑을 수 없습니다. 없는 자리를 설정해 ${번호들.length}개로 맞춰 주세요.`);
  }
}

function 내려받기(상태) {
  if (!상태.배치) return;
  const 바이트 = 자리표문서(문서설정(상태)); // 미리보기와 같은 설정
  const 덩이 = new Blob([바이트], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const 주소 = URL.createObjectURL(덩이);
  const a = h('a', { href: 주소, download: 자리표파일이름(판.반) });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(주소), 1000);
}
