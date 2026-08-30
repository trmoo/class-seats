/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  소스 전수 검사.
 *
 *  ⚠ 이것이 왜 필요한가 —
 *    `npm test` 는 탭 파일(DOM 을 만지는 곳)을 부르지 않는다.
 *    그래서 탭 파일에 괄호 하나가 빠져도 시험은 멀쩡히 통과하고 빌드에서야 터진다.
 *    여기서 파일을 하나하나 열어 문법과 우리 규칙을 함께 본다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

const 뿌리 = process.cwd();
const 잘못 = [];

function 파일모으기(폴더, 모음 = []) {
  for (const 이름 of readdirSync(폴더)) {
    const 길 = join(폴더, 이름);
    if (statSync(길).isDirectory()) 파일모으기(길, 모음);
    else if (이름.endsWith('.js') || 이름.endsWith('.mjs')) 모음.push(길);
  }
  return 모음;
}

const 소스들 = [
  ...파일모으기(join(뿌리, 'src')),
  ...파일모으기(join(뿌리, 'test')),
  ...파일모으기(join(뿌리, 'tools')),
  join(뿌리, 'vite.config.js'),
];

console.log(`\n  소스 ${소스들.length}개를 검사합니다.\n`);

for (const 길 of 소스들) {
  const 이름 = relative(뿌리, 길).replace(/\\/g, '/');
  const 글 = readFileSync(길, 'utf-8');

  // ① 문법
  try {
    execFileSync(process.execPath, ['--check', 길], { stdio: 'pipe' });
  } catch (e) {
    잘못.push(`${이름} — 문법 오류\n      ${String(e.stderr || e).split('\n').slice(0, 4).join('\n      ')}`);
    continue;
  }

  // ② 저작권 머리 주석. 화면·시험·도구 어디든 남긴다.
  if (!글.startsWith('/*!')) 잘못.push(`${이름} — 머리에 /*! 저작권 주석이 없다`);
  if (!글.slice(0, 400).includes('민준서')) 잘못.push(`${이름} — 원작자(민준서) 표시가 없다`);
  if (!글.slice(0, 400).includes('티쳐무')) 잘못.push(`${이름} — 개작자(티쳐무) 표시가 없다`);

  // ③ 자바스크립트 식별자로 쓸 수 없는 원문자를 이름에 쓰지 않았는가.
  //   한글은 식별자로 쓸 수 있지만 ⓐ ⓑ ① 같은 것은 안 된다. 실제로 한 번 빌드가 깨졌다.
  const 원문자 = 글.match(/(?:function|const|let|var)\s+[^\s(=]*[①-⓿][^\s(=]*/);
  if (원문자) 잘못.push(`${이름} — 이름에 원문자를 썼다: ${원문자[0]}  (자바스크립트 식별자가 아니다)`);

  // ④ 화면 수명 규칙. 탭 파일은 ui.js 를 거쳐야 한다.
  if (이름.startsWith('src/tabs/')) {
    if (/window\.addEventListener\(\s*['"]resize/.test(글)) {
      잘못.push(`${이름} — resize 를 직접 걸었다. ui.js 의 창크기바뀔때() 를 쓸 것`);
    }
    if (/setInterval\(/.test(글)) {
      잘못.push(`${이름} — setInterval 을 직접 썼다. ui.js 의 화면타이머() 를 쓸 것`);
    }
  }

  // ⑤ 브라우저 기본 대화상자 금지. 주소가 함께 떠서 교실 화면에 어울리지 않는다.
  const 기본창 = 글.match(/(?<![.\w])(alert|confirm|prompt)\s*\(/);
  if (기본창 && !이름.startsWith('tools/')) {
    잘못.push(`${이름} — ${기본창[1]}() 을 썼다. ui.js 의 알림() 을 쓸 것`);
  }
}

// ⑥ 화면 아래 푸터가 살아 있는가 (학생·교사가 실제로 보는 저작권 표시)
const 도움말 = readFileSync(join(뿌리, 'src/tabs/help.js'), 'utf-8');
if (!/export function 푸터/.test(도움말)) 잘못.push('src/tabs/help.js — 푸터() 가 없다');
for (const 탭 of ['pick.js', 'fair.js', 'help.js']) {
  const 글 = readFileSync(join(뿌리, 'src/tabs', 탭), 'utf-8');
  if (!글.includes('푸터()')) 잘못.push(`src/tabs/${탭} — 화면에 푸터() 를 넣지 않았다`);
}

if (잘못.length) {
  console.log(`  ❌ ${잘못.length}가지 문제\n`);
  for (const m of 잘못) console.log('    ' + m);
  console.log('');
  process.exit(1);
}
console.log(`  ✅ 소스 ${소스들.length}개 모두 통과 (문법 · 저작권 · 화면 수명 · 기본 대화상자)\n`);
