/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  교탁에 둘 자리배치표를 워드 파일(.docx)로 만든다. 바깥 라이브러리 없이.
 *
 *  ── 방향 ──────────────────────────────────────────────────────
 *  교사 시점이다. 교탁이 종이 아래에 오고, 1행(교탁 쪽 앞줄)이 맨 아래 줄이 된다.
 *  왼쪽·오른쪽은 화면과 같다(화면의 1열이 종이의 맨 왼쪽).
 *  → tools/hwp-이력.py 가 교사 시점 한글 자리표를 읽을 때 「행만 뒤집는」 것과 정확히 반대다.
 *    그래서 이 파일로 뽑은 자리표를 다시 이력으로 읽어도 자리가 어긋나지 않는다.
 *
 *  ── 빈 곳 ─────────────────────────────────────────────────────
 *  모든 행이 비어 있는 열은 통로로 보고 좁은 틈으로 그린다.
 *  그 밖의 없는 자리는 그리지 않거나(기본), 「빈 책상」 으로 그린다(이동수업용 책상 등).
 *  모든 열이 비어 있는 행은 아예 뺀다.
 *
 *  ⚠ DOM 을 쓰지 않는다 — node 시험에서 그대로 부른다.
 */
import { zip묶기 } from '../lib/zip.js';
import { 자리이름표 } from './roster.js';

// ── 종이 크기 (워드의 단위는 twip = 1/20 pt, 1mm ≈ 56.7 twip) ─────────
const 쪽가로 = 16838; // A4 가로 놓기
const 쪽세로 = 11906;
const 여백 = 567; // 1cm
const 본문가로 = 쪽가로 - 여백 * 2;
const 본문세로 = 쪽세로 - 여백 * 2;
const 명렬가로 = 2500;
const 명렬틈 = 300;
const 통로가로 = 480;
const 글꼴 = '맑은 고딕';

// 교사 시점 격자. 줄마다 [{ 종류: '자리'|'빈'|'통로', 번호 }]. 맨 아래 줄이 1행.
// 빈책상 이면 사람이 없는 줄도 빈 책상 줄로 남긴다(뒷줄의 이동수업용 책상 등).
export function 자리표모양(열, 행, 배치, 빈책상 = false) {
  const 칸 = (r, c) => 배치[r * 열 + c];
  const 통로 = [];
  for (let c = 0; c < 열; c++) {
    let 빔 = true;
    for (let r = 0; r < 행; r++) if (칸(r, c) != null) { 빔 = false; break; }
    통로.push(빔);
  }
  const 줄들 = [];
  for (let r = 행 - 1; r >= 0; r--) {
    const 줄 = [];
    let 그릴것 = false;
    for (let c = 0; c < 열; c++) {
      if (통로[c]) { 줄.push({ 종류: '통로' }); continue; }
      const 번호 = 칸(r, c);
      if (번호 == null) { 줄.push({ 종류: '빈' }); if (빈책상) 그릴것 = true; }
      else { 줄.push({ 종류: '자리', 번호 }); 그릴것 = true; }
    }
    if (그릴것) 줄들.push(줄);
  }
  // 양 끝의 통로는 틈으로 둘 까닭이 없으니 떼어 낸다
  while (줄들.length && 줄들[0][0]?.종류 === '통로') 줄들.forEach((줄) => 줄.shift());
  while (줄들.length && 줄들[0].at(-1)?.종류 === '통로') 줄들.forEach((줄) => 줄.pop());
  return 줄들;
}

// 날짜 기본값 「2026.11.10.~」
export function 오늘글(때 = new Date()) {
  return `${때.getFullYear()}.${때.getMonth() + 1}.${때.getDate()}.~`;
}

export function 자리표파일이름(반, 때 = new Date()) {
  const 날 = `${때.getFullYear()}-${String(때.getMonth() + 1).padStart(2, '0')}-${String(때.getDate()).padStart(2, '0')}`;
  const 반글 = String(반 || '').replace(/[\\/:*?"<>|\s]+/g, '');
  return `자리배치표${반글 ? '_' + 반글 : ''}_${날}.docx`;
}

/*  설정 = {
 *    열, 행, 배치,                    — 뽑은 결과 (배치[자리] = 번호, 없는 자리는 null)
 *    학생: [{번호, 이름, 비고, 재적}] | null,
 *    인사말: '줄바꿈으로 나눈 글', 회장, 부회장, 날짜, 담임,
 *    빈책상: false, 빈책상글: '(이동수업용)',
 *    명렬칸: true, 번호붙이기: false, 각주: '(*: 통합교육지원반)'
 *  }
 */
export function 자리표문서(설정) {
  return zip묶기([
    ['[Content_Types].xml', 내용종류],
    ['_rels/.rels', 뿌리관계],
    ['word/_rels/document.xml.rels', 문서관계],
    ['word/styles.xml', 꼴],
    ['word/document.xml', 본문xml(설정)],
  ]);
}

// ── 배치 계산 ────────────────────────────────────────────────
// 종이 위에 무엇을 어디에 몇 pt 로 놓을지만 정한다(글자·너비·높이, 단위 twip).
// 워드 파일(본문xml)과 화면 미리보기(chart-preview.js)가 이 결과를 똑같이 그린다 —
// 그래서 미리보기와 내려받은 파일이 어긋나지 않는다. ⚠ 크기 계산을 그리는 쪽에 따로 두지 말 것.
//
// 조각 = { 글, 크기(pt), 굵게 }
export const 종이 = { 쪽가로, 쪽세로, 여백, 본문가로, 본문세로 };

export function 자리표배치(설정) {
  const 학생 = 설정.학생 || null;
  const 번호표 = new Map((학생 || []).map((s) => [s.번호, s]));
  const 명렬있음 = !!(학생 && 설정.명렬칸 !== false);
  const 왼쪽가로 = 명렬있음 ? 본문가로 - 명렬가로 - 명렬틈 : 본문가로;

  const 모양 = 자리표모양(설정.열, 설정.행, 설정.배치, !!설정.빈책상);
  const 칸수 = 모양[0]?.length || 0;
  const 통로수 = 모양[0]?.filter((c) => c.종류 === '통로').length || 0;
  const 자리가로 = Math.max(600, Math.min(2400, Math.floor((왼쪽가로 - 200 - 통로수 * 통로가로) / Math.max(1, 칸수 - 통로수))));

  // 세로로 쓸 수 있는 몫에서 위·아래 글을 빼고 남는 만큼 줄 높이를 정한다
  const 인사줄 = String(설정.인사말 || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const 아래글 = [회장줄(설정), 설정.날짜 ? `날짜: ${설정.날짜}` : ''].filter(Boolean);
  const 고정 = 인사줄.length * 380 + (인사줄.length ? 300 : 0) + 260 + 560 + 260 + 아래글.length * 380 + 500;
  const 줄높이 = Math.max(380, Math.min(1000, Math.floor((본문세로 * 0.95 - 고정) / Math.max(1, 모양.length))));

  const 너비들 = 모양.length ? 모양[0].map((c) => (c.종류 === '통로' ? 통로가로 : 자리가로)) : [];
  const o = { 줄높이, 번호표, 빈책상: !!설정.빈책상, 빈책상글: 설정.빈책상글, 번호붙이기: !!설정.번호붙이기 };

  return {
    명렬있음,
    왼쪽가로,
    명렬가로,
    명렬틈,
    인사줄: 인사줄.map((글) => ({ 글, 크기: 13 })),
    인사뒤: 300,
    자리: { 너비들, 줄높이, 줄들: 모양.map((줄) => 줄.map((c, i) => 자리칸모양(c, 너비들[i], o))) },
    틈: 260,
    교탁: { 가로: Math.min(자리가로 * 2, Math.floor(왼쪽가로 * 0.4)), 높이: 560, 조각: { 글: '교탁', 크기: 15 } },
    아래글: 아래글.map((글) => ({ 글, 크기: 13 })),
    명렬: 명렬있음 ? 명렬모양(학생, 설정) : null,
  };
}

function 회장줄(설정) {
  const 조각 = [];
  if (설정.회장) 조각.push(`회장 : ${설정.회장}`);
  if (설정.부회장) 조각.push(`부회장 : ${설정.부회장}`);
  return 조각.length ? `( ${조각.join(' / ')} )` : '';
}

// 자리 한 칸. 번호가 0 이면 아직 뽑지 않은 자리(미리보기에서만 쓴다) — 빈 칸으로 둔다.
function 자리칸모양(c, 가로, o) {
  if (c.종류 === '통로') return { 종류: '통로', 테두리: false, 조각: [] };
  if (c.종류 === '빈') {
    if (!o.빈책상) return { 종류: '빈', 테두리: false, 조각: [] };
    const 빈글 = String(o.빈책상글 || '').trim();
    return { 종류: '빈', 테두리: true, 조각: 빈글 ? [{ 글: 빈글, 크기: 맞춤크기(빈글, 가로, o.줄높이, 14) }] : [] };
  }
  if (!c.번호) return { 종류: '자리', 테두리: true, 조각: [] };
  const s = o.번호표.get(c.번호);
  const 이름 = s ? 자리이름표(s.이름) : '';
  if (!이름) {
    return { 종류: '자리', 테두리: true, 조각: [{ 글: String(c.번호), 크기: 맞춤크기(String(c.번호), 가로, o.줄높이, 28), 굵게: true }] };
  }
  const 앞 = o.번호붙이기 ? `${c.번호} ` : '';
  const 크기 = 맞춤크기(앞 + 이름, 가로, o.줄높이, 28);
  const 조각 = [];
  if (앞) 조각.push({ 글: 앞, 크기: Math.max(8, Math.round(크기 * 0.55)) });
  조각.push({ 글: 이름, 크기, 굵게: true });
  return { 종류: '자리', 테두리: true, 조각 };
}

// 오른쪽 명렬. 줄마다 { 칸들: [{ 가로, 합침, 조각 }], 위, 아래 } — 위·아래는 굵은 가름선(1pt)
function 명렬모양(학생, 설정) {
  const 번가로 = 650;
  const 이가로 = 명렬가로 - 번가로;
  const 담임 = String(설정.담임 || '').trim();
  const 각주 = String(설정.각주 || '').trim();
  const 줄수 = 학생.length + 2 + (담임 ? 1 : 0) + (각주 ? 1 : 0);
  const 높이 = Math.max(230, Math.min(420, Math.floor((본문세로 * 0.94) / 줄수))); // 한글에서도 한 쪽에 들도록 6% 남긴다
  const 기본 = Math.max(7, Math.min(11, Math.floor((높이 / 20) * 0.62)));
  const 두칸 = (왼, 오, 덧 = {}) => ({ 칸들: [{ 가로: 번가로, 조각: [왼] }, { 가로: 이가로, 조각: [오] }], ...덧 });
  const 한칸 = (조각, 덧 = {}) => ({ 칸들: [{ 가로: 명렬가로, 합침: 2, 조각: [조각] }], ...덧 });

  const 줄들 = [두칸({ 글: '번호', 크기: 기본, 굵게: true }, { 글: '이름', 크기: 기본, 굵게: true }, { 아래: true })];
  for (const s of 학생) {
    const 이름 = s.재적 ? s.이름 : `${s.이름} (${s.비고})`;
    줄들.push(두칸({ 글: String(s.번호), 크기: 기본, 굵게: true }, { 글: 이름, 크기: Math.min(기본, 맞춤크기(이름, 이가로, 높이, 기본)) }));
  }
  if (담임) 줄들.push(두칸({ 글: '담임', 크기: 기본, 굵게: true }, { 글: 담임, 크기: 기본 }, { 위: true }));
  const 재적 = 학생.filter((s) => s.재적).length;
  줄들.push(한칸({ 글: `재적 ${재적}명`, 크기: 기본, 굵게: true }, { 위: true }));
  if (각주) 줄들.push(한칸({ 글: 각주, 크기: Math.min(기본, 맞춤크기(각주, 명렬가로, 높이, 기본)) }));
  return { 번가로, 이가로, 높이, 줄들 };
}

// ── 워드로 그리기 ────────────────────────────────────────────
export function 본문xml(설정) {
  const 배 = 자리표배치(설정);
  const 글들 = (조각들) => 조각들.map((x) => 글(x.글, x.크기, !!x.굵게));

  // 왼쪽: 인사말 · 자리 · 교탁 · 회장 · 날짜
  const 왼쪽 = [];
  배.인사줄.forEach((x, i) => 왼쪽.push(문단(글들([x]), { 뒤: i === 배.인사줄.length - 1 ? 배.인사뒤 : 0 })));
  왼쪽.push(자리표xml(배.자리, 글들));
  왼쪽.push(틈문단(배.틈));
  const 점선 = ['top', 'left', 'bottom', 'right'].map((쪽) => `<w:${쪽} w:val="dashed" w:sz="6" w:space="0" w:color="555555"/>`).join('');
  왼쪽.push(표([배.교탁.가로],
    [줄([칸({ 가로: 배.교탁.가로, 테두리: `<w:tcBorders>${점선}</w:tcBorders>`, 속: 문단(글들([배.교탁.조각])) })], 배.교탁.높이)],
    { 테두리: 없음테두리, 가운데: true }));
  왼쪽.push(틈문단(배.틈));
  배.아래글.forEach((x) => 왼쪽.push(문단(글들([x]))));

  let 몸;
  if (배.명렬) {
    몸 = 표(
      [배.왼쪽가로, 배.명렬틈, 배.명렬가로],
      [줄([
        칸({ 가로: 배.왼쪽가로, 속: 왼쪽.join('') }),
        칸({ 가로: 배.명렬틈, 속: 틈문단(0) }),
        칸({ 가로: 배.명렬가로, 속: 명렬표xml(배.명렬, 글들) + 틈문단(0) }),
      ])],
      { 테두리: 없음테두리 },
    );
  } else {
    몸 = 왼쪽.join('');
  }

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:document xmlns:w="${W}"><w:body>${몸}` +
    // 표 뒤에 워드가 반드시 두는 마지막 문단. 키가 크면 빈 둘째 쪽이 생기므로 1pt 로 눌러 둔다.
    '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>' +
    `<w:sectPr><w:pgSz w:w="${쪽가로}" w:h="${쪽세로}" w:orient="landscape"/>` +
    `<w:pgMar w:top="${여백}" w:right="${여백}" w:bottom="${여백}" w:left="${여백}" w:header="0" w:footer="0" w:gutter="0"/>` +
    '</w:sectPr></w:body></w:document>';
}

function 자리표xml(자리, 글들) {
  if (!자리.줄들.length) return 문단([글('(자리가 없습니다)', 14)]);
  const 줄들 = 자리.줄들.map((줄글) => 줄(줄글.map((c, i) => 칸({
    가로: 자리.너비들[i],
    테두리: c.테두리 ? 칸테두리(8) : '',
    속: c.조각.length ? 문단(글들(c.조각)) : 틈문단(0),
  })), 자리.줄높이));
  return 표(자리.너비들, 줄들, { 테두리: 없음테두리, 가운데: true });
}

function 명렬표xml(명렬, 글들) {
  const 줄들 = 명렬.줄들.map((r) => 줄(r.칸들.map((c) => 칸({
    가로: c.가로, 합침: c.합침 || 1, 위: r.위 ? 8 : 0, 아래: r.아래 ? 8 : 0, 속: 문단(글들(c.조각)),
  })), 명렬.높이));
  const 테두리 = '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right'].map((쪽) => `<w:${쪽} w:val="single" w:sz="12" w:space="0" w:color="000000"/>`).join('') +
    '<w:insideH w:val="dotted" w:sz="4" w:space="0" w:color="777777"/>' +
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>';
  return 표([명렬.번가로, 명렬.이가로], 줄들, { 테두리 });
}

// ── 글자 크기 맞춤 ───────────────────────────────────────────
// 칸 너비에 글자가 한 줄로 들어가도록 pt 를 정한다. 한글 한 자를 1, 영문·숫자를 0.6 쯤으로 센다.
export function 글폭(글) {
  let 폭 = 0;
  for (const c of 글) {
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ　-鿿＀-￯]/.test(c)) 폭 += 1;
    else if (/[A-Z0-9]/.test(c)) 폭 += 0.62;
    else if (/[a-z]/.test(c)) 폭 += 0.52;
    else if (c === ' ') 폭 += 0.3;
    else 폭 += 0.45;
  }
  return 폭;
}

export function 맞춤크기(글, 가로, 높이, 최대) {
  const 안가로 = 가로 / 20 - 12; // 칸 안쪽 여백을 뺀 pt
  const 폭 = Math.max(1, 글폭(글) * 1.08);
  const 크기 = Math.min(최대, 안가로 / 폭, (높이 / 20) * 0.62);
  return Math.max(6, Math.floor(크기 * 2) / 2);
}

// ── WordprocessingML 조각 ────────────────────────────────────
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const 없음테두리 = '<w:tblBorders>' +
  ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((쪽) => `<w:${쪽} w:val="nil"/>`).join('') +
  '</w:tblBorders>';

export function 이스케이프(s) {
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function 글(내용, pt, 굵게 = false) {
  const 반pt = Math.round(pt * 2);
  return `<w:r><w:rPr>${굵게 ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${반pt}"/><w:szCs w:val="${반pt}"/></w:rPr>` +
    `<w:t xml:space="preserve">${이스케이프(내용)}</w:t></w:r>`;
}

// 줄 간격은 「고정값」으로 둔다 — 글자 크기의 1.3배.
// ⚠ 「배수」(auto)로 두면 한글(HWP)이 줄 간격을 자기 기본값으로 넓혀 칸이 부풀고,
//   명렬 칸이 쪽을 넘어 빈 쪽이 생겼다(2026-11-10 한글로 열어 보다 발견). 워드는 그대로였다.
function 문단(조각들, { 뒤 = 0 } = {}) {
  const 가장큰 = Math.max(16, ...조각들.map((x) => Number(x.match(/<w:sz w:val="(\d+)"/)?.[1] || 0)));
  const 줄간격 = Math.ceil((가장큰 / 2) * 1.3 * 20);
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="${뒤}" w:line="${줄간격}" w:lineRule="exact"/><w:jc w:val="center"/></w:pPr>${조각들.join('')}</w:p>`;
}

// 높이만 차지하는 빈 문단. ⚠ 글자가 하나도 없으면 한글(HWP)이 높이를 무시해
// 자리표와 교탁이 딱 붙었다 — 아주 작은 빈칸 하나를 넣어 둔다.
function 틈문단(높이) {
  const h = Math.max(20, 높이);
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${h}" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>` +
    '<w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>';
}

function 칸테두리(sz) {
  return '<w:tcBorders>' +
    ['top', 'left', 'bottom', 'right'].map((쪽) => `<w:${쪽} w:val="single" w:sz="${sz}" w:space="0" w:color="000000"/>`).join('') +
    '</w:tcBorders>';
}

function 칸({ 가로, 속, 테두리 = '', 합침 = 1, 위 = 0, 아래 = 0 }) {
  let 선 = 테두리;
  if (!선 && (위 || 아래)) {
    선 = '<w:tcBorders>' +
      (위 ? `<w:top w:val="single" w:sz="${위}" w:space="0" w:color="000000"/>` : '') +
      (아래 ? `<w:bottom w:val="single" w:sz="${아래}" w:space="0" w:color="000000"/>` : '') +
      '</w:tcBorders>';
  }
  return `<w:tc><w:tcPr><w:tcW w:w="${가로}" w:type="dxa"/>${합침 > 1 ? `<w:gridSpan w:val="${합침}"/>` : ''}` +
    `${선}<w:vAlign w:val="center"/></w:tcPr>${속}</w:tc>`;
}

function 줄(칸들, 높이) {
  const 높 = 높이 ? `<w:trHeight w:val="${높이}" w:hRule="exact"/>` : '';
  return `<w:tr><w:trPr><w:cantSplit/>${높}</w:trPr>${칸들.join('')}</w:tr>`;
}

function 표(너비들, 줄들, { 테두리, 가운데 = false }) {
  const 합 = 너비들.reduce((a, b) => a + b, 0);
  return '<w:tbl><w:tblPr>' +
    `<w:tblW w:w="${합}" w:type="dxa"/>${가운데 ? '<w:jc w:val="center"/>' : ''}${테두리}` +
    '<w:tblLayout w:type="fixed"/>' +
    '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar>' +
    '</w:tblPr>' +
    `<w:tblGrid>${너비들.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    줄들.join('') + '</w:tbl>';
}

// ── 워드 파일의 뼈대 ─────────────────────────────────────────
const 내용종류 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>';

const 뿌리관계 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

const 문서관계 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

// 한글 글꼴은 eastAsia 를 따로 적어야 먹는다
const 꼴 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  `<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr>` +
  `<w:rFonts w:ascii="${글꼴}" w:hAnsi="${글꼴}" w:eastAsia="${글꼴}" w:cs="${글꼴}"/>` +
  '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/>' +
  '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="a"><w:name w:val="Normal"/></w:style>' +
  '<w:style w:type="table" w:default="1" w:styleId="a1"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/>' +
  '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
  '</w:styles>';
