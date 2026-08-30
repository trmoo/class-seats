/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  무작위 뽑기의 알맹이. 편향 없는 정수와 피셔–예이츠 섞기.
 */

// crypto.getRandomValues 는 부를 때마다 비용이 든다.
// 한 번에 넉넉히 받아 두고 하나씩 꺼내 쓴다. (회피 배치는 후보를 수백 벌 만들기 때문)
const 통크기 = 2048;
const 통 = new Uint32Array(통크기);
let 위치 = 통크기; // 처음에는 비어 있는 셈 치고 첫 호출에서 채운다

function 다음32() {
  if (위치 >= 통크기) {
    crypto.getRandomValues(통);
    위치 = 0;
  }
  return 통[위치++];
}

// 0 이상 max 미만의 정수를 편향 없이 하나 뽑는다.
//
// Math.floor(Math.random() * max) 는 max 가 2의 거듭제곱이 아니면
// 아주 작은 치우침이 생긴다. 자리 뽑기 규모에서는 티가 안 나지만,
// "공정성"이 이 앱의 주제이므로 처음부터 그 여지를 없앤다.
// max 로 나누어떨어지는 구간을 넘는 값은 버리고 다시 뽑는다.
export function 정수(max) {
  if (max <= 1) return 0;
  const 한계 = Math.floor(0x100000000 / max) * max; // 이 값 이상은 버린다
  for (;;) {
    const v = 다음32();
    if (v < 한계) return v % max;
  }
}

// 피셔–예이츠 섞기. 뒤에서부터 앞으로 오면서 무작위 자리와 맞바꾼다.
// 원작의 "이미 뽑은 번호면 다시 뽑기" 방식도 결과는 똑같이 공정하지만,
// 30자리 기준 평균 120번을 뽑아야 끝난다. 이 방식은 정확히 29번이면 끝난다.
export function 섞기(원본) {
  const a = [...원본];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 정수(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
