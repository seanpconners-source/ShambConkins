#!/usr/bin/env python3
"""Boulder Run scenery models: Quaternius CC0 packs (Stylized Nature MegaKit, Fantasy Props MegaKit) -> one game file.

  python3 tools/trun/build-props.py <nature dir> <props dir>

Writes assets/trun/props.bin.gz + assets/trun/ptex-<texture>.webp (the textures the models use, shrunk).
FORMAT (little endian): 'PRP1' u32 jsonLen, JSON, pad to 4, blob. JSON:
  models {name: {tris, lo:[x,y,z], hi:[x,y,z], groups:[{tex, cut, first, count}]}}  (first/count = index range)
  verts, vb (offset: verts * 32 bytes = pos f32x3, nrm f32x3, uv f32x2), ib (u32 indices)
Models are in metres, Y up, base at y=0, centred on x/z. Base-colour-only materials get a 4x4 swatch texture.
Originals of what is used: assets/originals/trun/props (LICENSE there).
"""
import os, sys, json, gzip, struct, glob, base64
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'assets/trun')
NATURE = ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5', 'TwistedTree_1', 'TwistedTree_2',
          'Pine_1', 'Pine_2', 'Pine_3', 'DeadTree_1', 'DeadTree_2', 'Bush_Common', 'Bush_Common_Flowers', 'Fern_1', 'Plant_1_Big',
          'Plant_7_Big', 'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Grass_Common_Tall', 'Flower_3_Group', 'Flower_4_Group']
PROPS = ['Torch_Metal', 'Lantern_Wall', 'Barrel', 'Barrel_Holder', 'Crate_Wooden', 'Crate_Metal', 'Chest_Wood', 'Vase_2', 'Vase_4',
         'Vase_Rubble_Medium', 'Banner_1', 'Banner_2', 'CandleStick_Triple', 'Pickaxe_Bronze', 'Bucket_Wooden_1', 'Anvil', 'Cauldron',
         'Stall_Cart_Empty']
# surface textures used straight on the path, walls and floors (tiled)
SURFACES = ['PathRocks_Diffuse', 'Rocks_Diffuse', 'Rocks_Desert_Diffuse', 'Grass', 'Bark_NormalTree', 'Bark_TwistedTree']
TEX = 512

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    j = json.load(open(path)); base = os.path.dirname(path); bufs = []
    for b in j['buffers']:
        u = b['uri']
        bufs.append(base64.b64decode(u.split(',', 1)[1]) if u.startswith('data:') else open(os.path.join(base, u), 'rb').read())
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', 0) or dt.itemsize * n
        raw = np.frombuffer(bufs[bv['buffer']], np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
        out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (stride, 1)).copy().view(dt).reshape(a['count'], n)
        if a.get('normalized'): out = out.astype(np.float32) / np.iinfo(dt).max
        return out.astype(np.float32) if dt != np.uint32 else out
    return j, base, acc


def trs(n):
    if 'matrix' in n: return np.array(n['matrix'], np.float64).reshape(4, 4).T
    t = np.array(n.get('translation', [0, 0, 0])); r = n.get('rotation', [0, 0, 0, 1]); s = np.array(n.get('scale', [1, 1, 1]))
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t; return M


def model(path):
    j, base, acc = load(path); prims = []
    def walk(ni, P):
        n = j['nodes'][ni]; M = P @ trs(n)
        if 'mesh' in n:
            for pr in j['meshes'][n['mesh']]['primitives']:
                at = pr['attributes']; pos = acc(at['POSITION']); nrm = acc(at['NORMAL']) if 'NORMAL' in at else np.zeros_like(pos)
                uv = acc(at['TEXCOORD_0']) if 'TEXCOORD_0' in at else np.zeros((len(pos), 2), np.float32)
                idx = acc(pr['indices']).reshape(-1).astype(np.int64) if 'indices' in pr else np.arange(len(pos))
                p4 = np.c_[pos, np.ones(len(pos))] @ M.T; nm = nrm @ np.linalg.inv(M[:3, :3]).T
                nm /= np.maximum(np.linalg.norm(nm, axis=1, keepdims=True), 1e-9)
                mat = j['materials'][pr['material']] if 'material' in pr else {}
                pbr = mat.get('pbrMetallicRoughness', {}); bc = pbr.get('baseColorTexture'); img = None
                if bc is not None: img = os.path.join(base, j['images'][j['textures'][bc['index']]['source']]['uri'])
                col = pbr.get('baseColorFactor', [1, 1, 1, 1])
                prims.append(dict(pos=p4[:, :3].astype(np.float32), nrm=nm.astype(np.float32), uv=uv, idx=idx, img=img, col=col,
                                  cut=mat.get('alphaMode') == 'MASK', name=mat.get('name', '')))
        for c in n.get('children', []): walk(c, M)
    for r in j['scenes'][j.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    return prims


def main():
    nat, props = sys.argv[1], sys.argv[2]
    find = lambda d, n: (glob.glob(os.path.join(d, '**', n + '.gltf'), recursive=True) or [None])[0]
    texs = {}; models = {}; VB = []; IB = []; base_v = 0; first = 0
    for name in NATURE + PROPS:
        p = find(nat if name in NATURE else props, name)
        if not p: print('missing', name); continue
        prims = model(p)
        allp = np.concatenate([q['pos'] for q in prims]); lo = allp.min(0); hi = allp.max(0); off = np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])
        groups = {}
        for q in prims:
            if q['img']:
                key = os.path.splitext(os.path.basename(q['img']))[0]
                if key not in texs: texs[key] = (q['img'], None)
            else:
                c = [int(max(0, min(1, v)) * 255) for v in q['col'][:3]]; key = 'c%02x%02x%02x' % tuple(c)
                if key not in texs: texs[key] = (None, c)
            groups.setdefault((key, q['cut']), []).append(q)
        mg = []; tris = 0
        for (key, cut), qs in groups.items():
            cnt = 0
            for q in qs:
                n = len(q['pos']); rec = np.zeros((n, 8), np.float32); rec[:, :3] = q['pos'] - off; rec[:, 3:6] = q['nrm']; rec[:, 6:8] = q['uv']
                VB.append(rec); IB.append((q['idx'] + base_v).astype(np.uint32)); base_v += n; cnt += len(q['idx'])
            mg.append(dict(tex='trun:ptex-' + key.lower().replace('_', '-'), cut=bool(cut), first=first, count=cnt)); first += cnt; tris += cnt // 3
        models[name] = dict(tris=tris, lo=(lo - off).round(3).tolist(), hi=(hi - off).round(3).tolist(), groups=mg)
        print('%-22s %6d tris  %.2f x %.2f x %.2f m  %s' % (name, tris, hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], ','.join(g['tex'][10:] for g in mg)))
    vb = np.concatenate(VB).astype('<f4').tobytes(); ib = np.concatenate(IB).astype('<u4').tobytes()
    J = dict(models=models, verts=base_v, vb=0, ib=len(vb))
    js = json.dumps(J, separators=(',', ':')).encode(); head = b'PRP1' + struct.pack('<I', len(js)) + js
    while len(head) % 4: head += b' '
    with gzip.open(os.path.join(OUT, 'props.bin.gz'), 'wb', 9) as f: f.write(head + vb + ib)
    print('props.bin.gz', os.path.getsize(os.path.join(OUT, 'props.bin.gz')) // 1024, 'KB', base_v, 'verts', len(ib) // 12, 'tris')
    for sname in SURFACES:
        f = (glob.glob(os.path.join(nat, '**', sname + '.png'), recursive=True) or [None])[0]
        if f: texs[sname] = (f, None)
    for key, (img, col) in texs.items():
        dst = os.path.join(OUT, 'ptex-%s.webp' % key.lower().replace('_', '-'))
        if img:
            im = Image.open(img).convert('RGBA'); im.thumbnail((TEX, TEX), Image.LANCZOS)
            if im.getextrema()[3][0] == 255: im = im.convert('RGB')
        else:
            im = Image.new('RGB', (4, 4), tuple(col))
        im.save(dst, 'WEBP', quality=88, method=6)
    print(len(texs), 'textures')


if __name__ == '__main__':
    main()
