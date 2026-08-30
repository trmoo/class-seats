/*! 랜덤 자리 뽑기 (class-seats)
 *  원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 *  학교 수업 목적으로만 이용해 주세요. 자세한 내용은 LICENSE 파일을 보세요.
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 빌드 결과 맨 앞에 남길 저작권 배너.
// `/*!` 로 시작해야 압축 과정에서 지워지지 않는다.
const 배너 = `/*! 랜덤 자리 뽑기 — 원작 © 2026 민준서 · 개작 © 2026 티쳐무 · 모든 권리 보유
 * 학교 수업 목적으로만 이용해 주세요. 무단 배포·상업적 이용을 금합니다. */`;

export default defineConfig({
  // GitHub Pages 하위 경로에서도 자원이 열리도록 상대 경로를 쓴다.
  base: './',
  plugins: [viteSingleFile()],
  // legalComments 를 'none' 으로 두면 `/*!` 배너까지 지워진다. 반드시 'inline'.
  esbuild: { legalComments: 'inline' },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { output: { banner: 배너 } },
  },
});
