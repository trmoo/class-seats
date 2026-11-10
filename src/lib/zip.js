/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  zip 묶음을 열고 만든다. 바깥 라이브러리 없이.
 *
 *  엑셀(.xlsx)과 워드(.docx)는 모두 「XML 파일 여러 개를 zip 으로 묶은 것」이다.
 *   - 열 때: 압축(deflate)된 조각은 브라우저에 들어 있는 DecompressionStream 으로 푼다.
 *   - 만들 때: 압축하지 않고(stored) 그대로 담는다. 자리표 한 장이라 크기 걱정이 없고,
 *     압축기를 따로 넣지 않아도 된다.
 */

// ── CRC-32 (zip 이 조각마다 적어 두는 검사값) ───────────────────
const CRC표 = (() => {
  const 표 = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    표[n] = c >>> 0;
  }
  return 표;
})();

export function crc32(바이트) {
  let c = 0xffffffff;
  for (let i = 0; i < 바이트.length; i++) c = CRC표[(c ^ 바이트[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── 열기 ──────────────────────────────────────────────────────
// 결과: { '파일/이름.xml': Uint8Array, ... }
export async function zip풀기(바이트) {
  const b = 바이트 instanceof Uint8Array ? 바이트 : new Uint8Array(바이트);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);

  // 맨 끝의 「목차 끝」 표시(0x06054b50)를 뒤에서부터 찾는다.
  let 끝 = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { 끝 = i; break; }
  }
  if (끝 < 0) throw new Error('zip 파일이 아닙니다');

  const 개수 = dv.getUint16(끝 + 10, true);
  let p = dv.getUint32(끝 + 16, true); // 목차가 시작하는 자리
  const 결과 = {};
  const 글풀개 = new TextDecoder('utf-8');

  for (let n = 0; n < 개수; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip 목차가 깨졌습니다');
    const 방식 = dv.getUint16(p + 10, true);
    const 압축크기 = dv.getUint32(p + 20, true);
    const 이름길이 = dv.getUint16(p + 28, true);
    const 덧길이 = dv.getUint16(p + 30, true);
    const 말길이 = dv.getUint16(p + 32, true);
    const 머리자리 = dv.getUint32(p + 42, true);
    const 이름 = 글풀개.decode(b.subarray(p + 46, p + 46 + 이름길이));
    p += 46 + 이름길이 + 덧길이 + 말길이;

    // 조각 머리(local header)의 이름·덧붙임 길이는 목차와 다를 수 있어 따로 읽는다.
    const 시작 = 머리자리 + 30 + dv.getUint16(머리자리 + 26, true) + dv.getUint16(머리자리 + 28, true);
    const 날것 = b.subarray(시작, 시작 + 압축크기);
    if (방식 === 0) 결과[이름] = 날것.slice();
    else if (방식 === 8) 결과[이름] = await 풀기(날것);
    // 그 밖의 방식은 엑셀·워드에 쓰이지 않으므로 건너뛴다
  }
  return 결과;
}

async function 풀기(날것) {
  const 흐름 = new Blob([날것]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(흐름).arrayBuffer());
}

// ── 만들기 (압축 없이 담기) ──────────────────────────────────
// 파일들: [[이름, 글 또는 Uint8Array], ...]  →  Uint8Array
export function zip묶기(파일들) {
  const 글묶개 = new TextEncoder();
  const 조각들 = [];
  const 목차들 = [];
  let 자리 = 0;
  // 1980-01-01 00:00 (zip 은 날짜를 DOS 형식으로 적는다. 언제 만들었는지는 중요하지 않다)
  const 시각 = 0;
  const 날짜 = (0 << 9) | (1 << 5) | 1;

  for (const [이름, 내용] of 파일들) {
    const 이름b = 글묶개.encode(이름);
    const 데이터 = typeof 내용 === 'string' ? 글묶개.encode(내용) : 내용;
    const crc = crc32(데이터);

    const 머리 = new DataView(new ArrayBuffer(30));
    머리.setUint32(0, 0x04034b50, true);
    머리.setUint16(4, 20, true);        // 풀 때 필요한 판
    머리.setUint16(6, 0x0800, true);    // 이름이 UTF-8
    머리.setUint16(8, 0, true);         // 압축 안 함
    머리.setUint16(10, 시각, true);
    머리.setUint16(12, 날짜, true);
    머리.setUint32(14, crc, true);
    머리.setUint32(18, 데이터.length, true);
    머리.setUint32(22, 데이터.length, true);
    머리.setUint16(26, 이름b.length, true);
    머리.setUint16(28, 0, true);
    조각들.push(new Uint8Array(머리.buffer), 이름b, 데이터);

    const 목 = new DataView(new ArrayBuffer(46));
    목.setUint32(0, 0x02014b50, true);
    목.setUint16(4, 20, true);
    목.setUint16(6, 20, true);
    목.setUint16(8, 0x0800, true);
    목.setUint16(10, 0, true);
    목.setUint16(12, 시각, true);
    목.setUint16(14, 날짜, true);
    목.setUint32(16, crc, true);
    목.setUint32(20, 데이터.length, true);
    목.setUint32(24, 데이터.length, true);
    목.setUint16(28, 이름b.length, true);
    목.setUint32(42, 자리, true);
    목차들.push(new Uint8Array(목.buffer), 이름b);

    자리 += 30 + 이름b.length + 데이터.length;
  }

  const 목차크기 = 목차들.reduce((s, x) => s + x.length, 0);
  const 끝 = new DataView(new ArrayBuffer(22));
  끝.setUint32(0, 0x06054b50, true);
  끝.setUint16(8, 파일들.length, true);
  끝.setUint16(10, 파일들.length, true);
  끝.setUint32(12, 목차크기, true);
  끝.setUint32(16, 자리, true);

  const 모두 = [...조각들, ...목차들, new Uint8Array(끝.buffer)];
  const 결과 = new Uint8Array(모두.reduce((s, x) => s + x.length, 0));
  let k = 0;
  for (const x of 모두) { 결과.set(x, k); k += x.length; }
  return 결과;
}
