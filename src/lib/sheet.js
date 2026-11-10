/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  표 파일(엑셀 .xlsx · .csv)을 「줄마다 칸 글자 배열」로 읽는다. 바깥 라이브러리 없이.
 *
 *  결과: [{ 이름: '시트 이름', 줄들: [['번호', '이름'], ['1', '김가온'], ...] }, ...]
 *  칸 내용은 모두 글자다. 숫자로 읽는 일은 명렬표(roster.js) 쪽에서 한다.
 *
 *  ⚠ DOMParser 를 쓰지 않는다 — 시험(node)에서도 그대로 돌리기 위해서다.
 *    엑셀이 만드는 XML 은 모양이 일정해서 정규식으로 충분히 읽힌다.
 */
import { zip풀기 } from './zip.js';

export async function 표읽기(파일이름, 바이트) {
  const b = 바이트 instanceof Uint8Array ? 바이트 : new Uint8Array(바이트);
  if (b.length === 0) throw new Error('빈 파일입니다.');

  // 앞 몇 바이트로 종류를 가린다. 확장자만 믿으면 이름만 바꾼 파일에 속는다.
  if (b[0] === 0x50 && b[1] === 0x4b) return xlsx읽기(b);              // 'PK' = zip = .xlsx
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) {  // 옛 엑셀(.xls)
    throw new Error(
      '옛 엑셀 형식(.xls)이라 읽을 수 없습니다.\n' +
      "엑셀에서 [파일] → [다른 이름으로 저장] → 'Excel 통합 문서(*.xlsx)' 로 저장한 뒤 넣어 주세요.");
  }

  const 글 = 글로풀기(b);
  // 나이스 등에서 받은 「.xls」 가운데에는 사실 HTML 표인 것이 있다
  if (/^\s*</.test(글) && /<table/i.test(글)) return [{ 이름: 파일이름, 줄들: html표(글) }];
  return [{ 이름: 파일이름, 줄들: csv(글) }];
}

// UTF-8 이 아니면 한국어 윈도우 엑셀이 저장하는 CP949(euc-kr)로 본다.
export function 글로풀기(b) {
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(b.subarray(3));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return new TextDecoder('euc-kr').decode(b);
  }
}

// ── CSV (쉼표·탭·쌍반점 가운데 첫 줄에 많은 것으로 나눈다) ─────────
export function csv(글) {
  const 첫줄 = (글.split(/\r?\n/).find((줄) => 줄.trim() !== '') || '');
  const 나눔 = [',', '\t', ';'].sort((a, c) => 첫줄.split(c).length - 첫줄.split(a).length)[0];

  const 줄들 = [];
  let 줄 = [];
  let 칸 = '';
  let 따옴표안 = false;
  for (let i = 0; i < 글.length; i++) {
    const 글자 = 글[i];
    if (따옴표안) {
      if (글자 === '"' && 글[i + 1] === '"') { 칸 += '"'; i++; }
      else if (글자 === '"') 따옴표안 = false;
      else 칸 += 글자;
    } else if (글자 === '"' && 칸 === '') 따옴표안 = true;
    else if (글자 === 나눔) { 줄.push(칸); 칸 = ''; }
    else if (글자 === '\n' || 글자 === '\r') {
      if (글자 === '\r' && 글[i + 1] === '\n') i++;
      줄.push(칸); 줄들.push(줄); 줄 = []; 칸 = '';
    } else 칸 += 글자;
  }
  if (칸 !== '' || 줄.length) { 줄.push(칸); 줄들.push(줄); }
  return 줄들.map((r) => r.map((c) => c.trim()));
}

// ── HTML 표 ──────────────────────────────────────────────────
function html표(글) {
  const 줄들 = [];
  for (const [, tr] of 글.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const 칸들 = [...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(([, 속]) => 낱글(속.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).trim());
    줄들.push(칸들);
  }
  return 줄들;
}

// ── 엑셀 .xlsx ────────────────────────────────────────────────
async function xlsx읽기(b) {
  let 파일들;
  try {
    파일들 = await zip풀기(b);
  } catch {
    throw new Error('엑셀 파일을 열 수 없습니다. 파일이 깨졌거나 암호가 걸려 있을 수 있습니다.');
  }
  const 글 = (이름) => (파일들[이름] ? new TextDecoder('utf-8').decode(파일들[이름]) : '');
  if (!파일들['xl/workbook.xml']) {
    throw new Error('엑셀 통합 문서(.xlsx)가 아닙니다. 암호가 걸린 파일이면 암호를 풀고 저장해 주세요.');
  }

  // 같은 글자는 한 번만 적고 번호로 가리킨다(공유 문자열 표)
  const 공유 = [...글('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(([, si]) => 글자모으기(si));

  // 시트 이름 → 실제 파일 경로 (workbook.xml 의 차례가 엑셀 아래쪽 탭 차례다)
  const 관계 = {};
  for (const [태그] of 글('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = 속성(태그, 'Id');
    let 대상 = 속성(태그, 'Target') || '';
    대상 = 대상.startsWith('/') ? 대상.slice(1) : 'xl/' + 대상.replace(/^\.\//, '');
    관계[id] = 대상;
  }

  const 시트들 = [];
  for (const [태그] of 글('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const 경로 = 관계[속성(태그, 'r:id')];
    if (!경로 || !파일들[경로]) continue;
    시트들.push({ 이름: 낱글(속성(태그, 'name') || ''), 줄들: 시트읽기(글(경로), 공유) });
  }
  if (!시트들.length) throw new Error('엑셀 파일에서 시트를 찾지 못했습니다.');
  return 시트들;
}

function 시트읽기(xml, 공유) {
  const 줄들 = [];
  let 다음줄 = 0;
  for (const [, 줄속성, 속] of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(속성(줄속성, 'r')) || 다음줄 + 1;
    다음줄 = r;
    const 줄 = [];
    let 다음칸 = 0;
    for (const [, 칸속성, 칸속] of (속 || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const 주소 = 속성(칸속성, 'r');
      const 열 = 주소 ? 열번호(주소) : 다음칸;
      다음칸 = 열 + 1;
      const 종류 = 속성(칸속성, 't');
      let 값 = '';
      if (종류 === 'inlineStr') 값 = 글자모으기((칸속 || '').match(/<is>([\s\S]*?)<\/is>/)?.[1] || '');
      else {
        const v = (칸속 || '').match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v != null) 값 = 종류 === 's' ? 공유[Number(v)] ?? '' : 낱글(v);
      }
      줄[열] = 값.trim();
    }
    줄들[r - 1] = Array.from(줄, (c) => c ?? '');
  }
  return Array.from(줄들, (줄) => 줄 ?? []);
}

// <t> 안의 글자만 모은다. 일본어 읽기 표시(<rPh>)는 뺀다.
function 글자모으기(xml) {
  const 본문 = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  return [...본문.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(([, t]) => 낱글(t)).join('');
}

function 속성(태그, 이름) {
  const 맞음 = 태그.match(new RegExp(`(?:^|\\s)${이름.replace(':', '\\:')}="([^"]*)"`));
  return 맞음 ? 맞음[1] : null;
}

// "AB12" → 27 (0부터 센 열 번호)
function 열번호(주소) {
  const 글자 = 주소.match(/^[A-Z]+/)?.[0] || 'A';
  let n = 0;
  for (const c of 글자) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

// XML 의 &amp; 같은 표기와 엑셀의 _x000D_ 표기를 글자로 되돌린다.
export function 낱글(글) {
  return 글
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
