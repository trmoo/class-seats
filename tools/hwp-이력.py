# -*- coding: utf-8 -*-
"""! 랜덤 자리 뽑기 — 원작 (C) 2026 민준서 · 개작 (C) 2026 티쳐무 · 모든 권리 보유

한글(.hwp / .hwpx) 자리배치표를 앱이 읽는 `자리이력.json` 으로 바꾼다.

    pip install olefile lxml
    python tools/hwp-이력.py "자리배치표가_있는_폴더" -o 자리이력.json

★ 결과 파일에는 이름이 한 글자도 들어가지 않는다. 번호와 자리만 남는다.
  (앱이 이름·학번을 받지 않는 것이 원칙이므로 이력에도 번호만 둔다)
  ⚠ 그래도 실제 학급의 자리 기록이므로 공개 저장소에 올리지 말 것.
     `.gitignore` 가 `자리이력*.json` 을 막고 있다.

── 읽으면서 챙기는 것 ────────────────────────────────────────
 ① 통로 — 사람이 앉지 않는 열은 「없는 자리」로 남긴다.
    통로를 지우고 열을 붙이면 통로 건너편 사람이 짝으로 잡혀 버린다.
 ② 교탁이 표 아래에 있으면(교사 시점) 행을 뒤집는다.
    앱은 교탁을 위에 그리므로, 안 뒤집으면 앞자리가 뒷자리로 기록된다.
 ③ `*`(통합교육지원반 표시)는 명단에서는 이름 뒤에, 자리표에서는 앞에 붙는다.
    양쪽 끝을 모두 떼어야 이름이 맞는다.
 ④ 학생 행에 가로 병합이 섞인 파일은 열 위치를 믿을 수 없어 건너뛴다.
    (짝은 좌우로 붙어 앉은 사이라 열이 틀리면 짝도 틀린다)
"""
import argparse, collections, glob, json, os, re, struct, sys, zipfile, zlib

try:
    import olefile
except ImportError:
    sys.exit('olefile 이 필요합니다:  pip install olefile')

HWPTAG_BEGIN = 0x10
TAG_PARA_TEXT = HWPTAG_BEGIN + 51    # 67
TAG_LIST_HEADER = HWPTAG_BEGIN + 56  # 72
TAG_TABLE = HWPTAG_BEGIN + 61        # 77 ⚠ 60 은 SHAPE_COMPONENT 다. 한 칸 어긋나면 표를 못 찾는다
P = 'http://www.hancom.co.kr/hwpml/2011/paragraph'

EXTENDED = {1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23}
INLINE = {4, 5, 6, 7, 8, 19, 20}


def records(buf):
    i, n = 0, len(buf)
    while i + 4 <= n:
        head = struct.unpack_from('<I', buf, i)[0]
        tag, size = head & 0x3FF, (head >> 20) & 0xFFF
        i += 4
        if size == 0xFFF:
            size = struct.unpack_from('<I', buf, i)[0]
            i += 4
        yield tag, buf[i:i + size]
        i += size


def para_text(payload):
    out, i, n = [], 0, len(payload)
    while i + 2 <= n:
        code = struct.unpack_from('<H', payload, i)[0]
        if code in EXTENDED:
            i += 16
        elif code in INLINE or code < 32 and code not in (10, 13):
            i += 2
        elif code in (10, 13):
            out.append('\n'); i += 2
        else:
            out.append(chr(code)); i += 2
    return ''.join(out)


def 표읽기(path):
    """[[ (행, 열, 가로병합, 글자), ... ], ...] — 표마다 한 묶음."""
    if path.lower().endswith('.hwpx'):
        from lxml import etree
        root = etree.fromstring(zipfile.ZipFile(path).read('Contents/section0.xml'))
        표들 = []
        for tbl in root.iter('{%s}tbl' % P):
            칸 = []
            for tc in tbl.iter('{%s}tc' % P):
                a = tc.find('{%s}cellAddr' % P)
                sp = tc.find('{%s}cellSpan' % P)
                if a is None:
                    continue
                글 = ''.join(t.text or '' for t in tc.iter('{%s}t' % P))
                칸.append((int(a.get('rowAddr')), int(a.get('colAddr')),
                           int(sp.get('colSpan')) if sp is not None else 1, 글.strip()))
            if 칸:
                표들.append(칸)
        return 표들

    ole = olefile.OleFileIO(path)
    압축 = bool(ole.openstream('FileHeader').read()[36] & 1)
    덩이 = []
    for s in sorted(e for e in ole.listdir() if e[0] == 'BodyText'):
        raw = ole.openstream(s).read()
        덩이.append(zlib.decompress(raw, -15) if 압축 else raw)
    buf = b''.join(덩이)

    표들, 지금, cur = [], None, None
    for tag, pay in records(buf):
        if tag == TAG_TABLE:
            지금 = []; 표들.append(지금); cur = None
        elif tag == TAG_LIST_HEADER and len(pay) >= 16 and 지금 is not None:
            col, row, cs, _rs = struct.unpack_from('<HHHH', pay, 8)
            cur = [row, col, cs, []]
            지금.append(cur)
        elif tag == TAG_PARA_TEXT and cur is not None:
            cur[3].append(para_text(pay))
    return [[(r, c, cs, ''.join(g).strip()) for r, c, cs, g in t] for t in 표들 if t]


def 이름정리(s):
    s = s.strip().strip('*').strip()      # ③ `*` 는 앞뒤 어디든 붙는다
    s = s.split('\n')[0].strip()
    return re.sub(r'\(.*?\)', '', s).strip()


def 한파일(path):
    표들 = 표읽기(path)
    폭 = lambda t: max(c for r, c, cs, g in t)
    명단표 = max((t for t in 표들 if 폭(t) == 1), key=len, default=None)
    자리표 = max((t for t in 표들 if t is not 명단표), key=폭, default=None)
    if not 명단표 or not 자리표:
        return None, '표를 찾지 못했습니다'

    칸 = {(r, c): g for r, c, cs, g in 명단표}
    이름번호 = {}
    for r in range(max(r for r, c in 칸) + 1):
        번호, 이름 = 칸.get((r, 0), '').strip(), 이름정리(칸.get((r, 1), ''))
        if re.fullmatch(r'\d+', 번호) and 이름:
            이름번호[이름] = int(번호)
    if not 이름번호:
        return None, '명단을 읽지 못했습니다'

    자리칸 = {(r, c): g for r, c, cs, g in 자리표}
    교탁행 = min((r for (r, c), g in 자리칸.items() if '교탁' in g), default=None)
    끝 = 교탁행 if 교탁행 is not None else max(r for r, c in 자리칸) + 1
    열수 = max(c for r, c in 자리칸) + 1
    학생행 = [r for r in range(끝)
              if any(이름정리(자리칸.get((r, c), '')) in 이름번호 for c in range(열수))]
    if not 학생행:
        return None, '자리표에서 학생을 찾지 못했습니다'

    # ④ 학생 행에 가로 병합이 있으면 열 위치를 믿을 수 없다
    병합 = max((cs for r, c, cs, g in 자리표 if r in 학생행), default=1)
    if 병합 > 1:
        return None, f'학생 행에 가로 병합({병합}칸)이 있어 자리 위치를 믿을 수 없습니다'

    격자 = [[이름번호.get(이름정리(자리칸.get((r, c), ''))) for c in range(열수)]
            for r in 학생행]
    if 교탁행 is not None and 교탁행 >= len(학생행):
        격자.reverse()                      # ② 교탁이 아래 → 뒤집는다

    날짜 = None
    for 표 in 표들:
        for r, c, cs, g in 표:
            m = re.search(r'(20\d\d)\.\s*(\d{1,2})\.\s*(\d{1,2})', g)
            if m:
                날짜 = '%04d-%02d-%02d' % tuple(int(x) for x in m.groups())
                break
        if 날짜:
            break
    if not 날짜:
        import datetime
        날짜 = datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()

    앉은 = sum(1 for 줄 in 격자 for v in 줄 if v is not None)
    if 앉은 != len(이름번호):
        return None, f'명단 {len(이름번호)}명인데 자리에 앉은 사람은 {앉은}명입니다'
    return {'때': 날짜 + 'T09:00:00.000Z', '열': 열수, '행': len(격자),
            '배치': [v for 줄 in 격자 for v in 줄]}, None


def main():
    ap = argparse.ArgumentParser(description='한글 자리배치표 → 자리이력.json')
    ap.add_argument('경로', help='자리배치표가 있는 폴더, 또는 파일 패턴')
    ap.add_argument('-o', '--출력', default='자리이력.json')
    args = ap.parse_args()

    후보 = (sorted(glob.glob(os.path.join(args.경로, '*.hwp')) +
                   glob.glob(os.path.join(args.경로, '*.hwpx')))
            if os.path.isdir(args.경로) else sorted(glob.glob(args.경로)))
    if not 후보:
        sys.exit('파일을 찾지 못했습니다: ' + args.경로)

    이력, 건너뜀 = [], []
    for p in 후보:
        try:
            항목, 까닭 = 한파일(p)
        except Exception as e:
            항목, 까닭 = None, f'{type(e).__name__}: {e}'
        if 항목:
            이력.append(항목)
            print(f'  ✅ {os.path.basename(p)[:44]:46} {항목["때"][:10]}  '
                  f'{항목["열"]}열×{항목["행"]}행  '
                  f'{sum(1 for v in 항목["배치"] if v is not None)}명')
        else:
            건너뜀.append((os.path.basename(p), 까닭))

    for 이름, 까닭 in 건너뜀:
        print(f'  ⏭ {이름[:44]:46} {까닭}')

    if not 이력:
        sys.exit('\n쓸 수 있는 배치표가 없습니다.')

    이력.sort(key=lambda h: h['때'], reverse=True)      # 앱은 0번이 가장 최근
    with open(args.출력, 'w', encoding='utf-8') as f:
        json.dump({'v': 1, '앱': 'class-seats', '이력': 이력}, f,
                  ensure_ascii=False, indent=1)
    print(f'\n{args.출력} 저장 — {len(이력)}회분 (이름 없음, 번호만).')
    print('앱의 [📁 기억해 둔 지난 배치] → [⬆ 파일 불러오기] 로 넣으세요.')
    print('⚠ 앱은 가장 최근 5회분만 보관합니다. 그보다 오래된 것은 버려집니다.')


if __name__ == '__main__':
    main()
