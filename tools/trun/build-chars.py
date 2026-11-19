#!/usr/bin/env python3
"""Temple Run (Boulder Run revamp) characters: Quaternius CC0 bodies + outfits -> game files.

  python3 tools/trun/build-chars.py [--only indy,lara] [--tex 2048]

Sources: assets/originals/trun (bodies/outfits/hair/anims/textures, CC0, see LICENSE-*.txt there).
Writes assets/trun/:
  <char>.skm.gz        one skinned mesh per character (see FORMAT below)
  <char>-<mat>.webp    its textures (clothes recoloured, garments painted on the skin)
  anims.skm.gz         the animation clips the game uses, sampled at 30 fps

FORMAT (little endian): 'SKM1' u32 jsonLen, JSON, pad to 4, binary blob. JSON has
  joints  [{n,p,t,r,s}]  (p = parent index or -1; rest pose; only joints the mesh needs + their parents)
  ibm     byte offset of joints*16 float32 inverse bind matrices (column-major)
  verts   count; vb = offset of verts*28 bytes: pos f32x3, nrm i8x4, uv u16x2 (0..1), joint u8x4, weight u8x4
  groups  [{mat,tex,first,count}] index ranges (u32 indices at ib)
  attach  {name:{joint,t,r}} bones for props the game adds (hat, braid root...)
anims.skm.gz JSON: {fps, joints:[names], clips:[{n,frames,loop,rot (byte offset of frames*J*4 int16), pel (frames*3 f32)}]}
"""
import os, sys, json, gzip, struct, io, argparse
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gltf import Gltf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SRC = os.path.join(ROOT, 'assets/originals/trun')
OUT = os.path.join(ROOT, 'assets/trun')
TEXD = os.path.join(SRC, 'textures')

# ---------------------------------------------------------------- recipes
# parts: (file, mesh names to keep (substring match), materials to skip)
RECIPES = {
    'indy': dict(
        body='bodies/Superhero_Male_FullBody.gltf', skin='T_Superhero_Male_Dark.png',
        parts=[('outfits/Male_Ranger.gltf', ['Male_Ranger_Body', 'Male_Ranger_Body_Belt_1', 'Male_Ranger_Arms', 'Male_Ranger_Legs', 'Male_Ranger_Feet_Boots'], ['MI_Regular_Male']),
               ('hair/Hair_SimpleParted.gltf', ['Hair'], [])],
        cloth={'Male_Ranger_Body': 'jacket', 'Male_Ranger_Arms': 'jacket', 'Male_Ranger_Legs': 'trousers'},
        colors={'jacket': (20, .60, .30), 'trousers': (38, .40, .50)},  # hue deg, sat, median value
        hair=(25, .55, .30),
    ),
    'lara': dict(
        body='bodies/Superhero_Female_FullBody.gltf', skin='T_Superhero_Female_Dark_BaseColor.png',
        parts=[('outfits/Female_Ranger.gltf', ['Female_Ranger_Feet'], []),
               ('hair/Hair_BuzzedFemale.gltf', ['Hair'], [])],
        cloth={}, colors={},
        paint=True,
        hair=(20, .6, .35),
    ),
}

CLIPS = {  # game name: (source clip, loop)
    'run': ('Sprint_Loop', True), 'jog': ('Jog_Fwd_Loop', True), 'idle': ('Idle_Loop', True),
    'jumpStart': ('Jump_Start', False), 'jumpAir': ('Jump_Loop', True), 'jumpLand': ('Jump_Land', False),
    'slideStart': ('Slide_Start', False), 'slide': ('Slide_Loop', True), 'slideEnd': ('Slide_Exit', False),
    'roll': ('Roll', False), 'die': ('Death01', False), 'hit': ('Hit_Knockback', False), 'stumble': ('Hit_Chest', False),
    'climb': ('ClimbUp_1m', False), 'swim': ('Swim_Fwd_Loop', True), 'dance': ('Dance_Loop', True),
    'ninjaStart': ('NinjaJump_Start', False), 'ninjaAir': ('NinjaJump_Idle_Loop', True), 'ninjaLand': ('NinjaJump_Land', False),
    'yes': ('Yes', False), 'walk': ('Walk_Loop', True), 'pickup': ('PickUp_Table', False),
}


# ---------------------------------------------------------------- helpers
def tex(name):
    return Image.open(os.path.join(TEXD, name)).convert('RGB')


def rgb2hsv(a):
    a = a.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r); gg = m & (mx == g) & ~rr; bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv2rgb(h, s, v):
    c = v * s; hp = (h / 60) % 6; x = c * (1 - np.abs(hp % 2 - 1)); z = np.zeros_like(h)
    r, g, b = [np.select([hp < 1, hp < 2, hp < 3, hp < 4, hp < 5, hp >= 5], c_) for c_ in
               ([c, x, z, z, x, c], [x, c, c, x, z, z], [z, z, x, c, c, x])]
    m = v - c
    return np.clip(np.stack([r + m, g + m, b + m], -1) * 255, 0, 255).astype(np.uint8)


def raster_uv(prims_tris, size, attr=None):
    """Rasterise triangles in UV space. prims_tris: list of (uv (n,2), idx (m,3), values (n,k) or None).
    Returns mask (size,size) bool and, if values given, an interpolated (size,size,k) map."""
    mask = np.zeros((size, size), bool)
    out = None
    for uv, idx, val in prims_tris:
        P = uv * size  # glTF uv: origin top-left, v down = image rows
        if val is not None and out is None:
            out = np.zeros((size, size, val.shape[1]), np.float32)
        for t in idx:
            a, b, c = P[t[0]], P[t[1]], P[t[2]]
            x0 = int(max(0, np.floor(min(a[0], b[0], c[0])))); x1 = int(min(size - 1, np.ceil(max(a[0], b[0], c[0]))))
            y0 = int(max(0, np.floor(min(a[1], b[1], c[1])))); y1 = int(min(size - 1, np.ceil(max(a[1], b[1], c[1]))))
            if x1 < x0 or y1 < y0:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
            den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(den) < 1e-12:
                continue
            w0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den
            w1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den
            w2 = 1 - w0 - w1
            e = -.02  # include edge texels (pad against seams)
            ins = (w0 >= e) & (w1 >= e) & (w2 >= e)
            if not ins.any():
                continue
            yy = (ys[ins] - .5).astype(int); xx = (xs[ins] - .5).astype(int)
            mask[yy, xx] = True
            if val is not None:
                out[yy, xx] = (w0[ins, None] * val[t[0]] + w1[ins, None] * val[t[1]] + w2[ins, None] * val[t[2]])
    return mask, out


def dilate(m, n=2):
    m = m.copy()
    for _ in range(n):
        m[1:] |= m[:-1]; m[:-1] |= m[1:]; m[:, 1:] |= m[:, :-1]; m[:, :-1] |= m[:, 1:]
    return m


def recolor(img, mask, hue, sat, vk, only_green=True):
    """Greens inside mask -> hue/sat; brightness scaled so the garment's median value lands on vk (shading kept)."""
    a = np.asarray(img).copy()
    h, s, v = rgb2hsv(a)
    sel = mask & ((h > 55) & (h < 175) & (s > .18) if only_green else True)
    if not sel.any():
        return img
    med = float(np.median(v[sel]))
    nv = np.clip(v / max(med, 1e-3) * vk, 0, 1)
    rgb = hsv2rgb(np.full_like(h, hue), np.full_like(h, sat), nv)
    a[sel] = rgb[sel]
    return Image.fromarray(a)


# ---------------------------------------------------------------- body under clothes
def cull_hidden(body, cloth_prims):
    """Drop body triangles hidden under cloth: a body vertex is covered if a cloth surface lies along its normal
    within IN (inside the skin) .. OUT (outside). Triangles with every vertex covered go."""
    IN, OUT = .045, .09
    tris = []
    for p in cloth_prims:
        tris.append(p['pos'][p['idx']])
    T = np.concatenate(tris)  # (m,3,3)
    cell = .06
    lo = T.min((0, 1)) - .2
    keyset = {}
    mn = np.floor((T.min(1) - lo) / cell).astype(int); mx = np.floor((T.max(1) - lo) / cell).astype(int)
    for i in range(len(T)):
        for x in range(mn[i, 0], mx[i, 0] + 1):
            for y in range(mn[i, 1], mx[i, 1] + 1):
                for z in range(mn[i, 2], mx[i, 2] + 1):
                    keyset.setdefault((x, y, z), []).append(i)
    P, N = body['pos'], body['nrm'] / np.maximum(np.linalg.norm(body['nrm'], axis=1, keepdims=True), 1e-9)
    cov = np.zeros(len(P), bool)
    for vi in range(len(P)):
        o = P[vi] - N[vi] * IN; d = N[vi]; L = IN + OUT
        cand = set()
        for k in np.linspace(0, L, 4):
            c = tuple(np.floor((o + d * k - lo) / cell).astype(int))
            cand.update(keyset.get(c, ()))
        if not cand:
            continue
        tt = T[list(cand)]
        e1 = tt[:, 1] - tt[:, 0]; e2 = tt[:, 2] - tt[:, 0]
        pv = np.cross(d, e2); det = (e1 * pv).sum(1)
        ok = np.abs(det) > 1e-10
        inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
        tv = o - tt[:, 0]
        u = (tv * pv).sum(1) * inv
        qv = np.cross(tv, e1)
        v = (qv * d).sum(1) * inv
        t = (e2 * qv).sum(1) * inv
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t >= 0) & (t <= L)
        cov[vi] = hit.any()
    idx = body['idx']
    keep = ~(cov[idx].sum(1) >= 2)
    body = dict(body); body['idx'] = idx[keep]
    print('  cull: %d of %d body verts covered, %d of %d tris dropped' % (cov.sum(), len(P), (~keep).sum(), len(idx)))
    return body


# ---------------------------------------------------------------- Lara's painted garments
def paint_lara(skin_img, body, size):
    """Tank top (teal) + shorts (brown) + fingerless gloves painted on the skin texture from each texel's 3D spot."""
    P = body['pos']
    J = body['joints']
    jw = np.zeros((len(P), len(J)), np.float32)
    for k in range(4):
        jw[np.arange(len(P)), body['jt'][:, k]] += body['wt'][:, k]
    nm = {n: i for i, n in enumerate(J)}
    def w(*names): return sum(jw[:, nm[n]] for n in names)
    arm = w('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r')
    hand = sum(jw[:, i] for n, i in nm.items() if n.startswith(('hand', 'index', 'middle', 'ring', 'pinky', 'thumb')))
    thigh = w('thigh_l', 'thigh_r', 'calf_l', 'calf_r')
    vals = np.concatenate([P, arm[:, None], hand[:, None], thigh[:, None]], 1)
    mask, M = raster_uv([(body['uv'], body['idx'], vals)], size)
    x, y, z = M[..., 0], M[..., 1], M[..., 2]
    A, H, TH = M[..., 3], M[..., 4], M[..., 5]
    # body proportions from the mesh
    top = P[:, 1].max(); s = top / 1.75
    a = np.asarray(skin_img.resize((size, size), Image.LANCZOS)).astype(np.float32)
    lum = a.mean(-1, keepdims=True)
    _, sat_, _ = rgb2hsv(a.astype(np.uint8))
    bikini = (sat_ < .22)[..., None] & (lum < 110)
    skin_med = float(np.median(lum[mask & ~bikini[..., 0]]))
    lum = np.where(bikini, skin_med, lum) / skin_med
    out = a.copy()
    # tank top: waist .. armpit, straps over the shoulders, no arms
    yw, ya, yn = 1.03 * s, 1.415 * s, 1.50 * s
    strap = (np.abs(np.abs(x) - .075 * s) < .022 * s)
    tank = mask & (A < .45) & (y > yw) & ((y < ya) | ((y < yn) & strap))
    # scoop neck at the front, lower back
    tank &= ~((z > .03) & (y > ya - .03 * s) & (np.abs(x) < .055 * s))
    tank &= ~((z < -.03) & (y > ya - .02 * s) & (np.abs(x) < .06 * s))
    # anything still showing the old bikini outside the garments becomes skin
    rest = mask & bikini[..., 0]
    teal = np.array([46, 128, 138], np.float32)
    out[tank] = (teal * np.clip(lum[tank] * 1.05, .45, 1.35)).clip(0, 255)
    # shorts: from below the navel to upper thigh
    yb, yt = .99 * s, .80 * s
    leg_len = np.clip((y - yt) / (yb - yt), 0, 1)
    shorts = mask & (y < yb + .02 * s) & (y > yt) & (A < .4) & ~tank
    brown = np.array([112, 84, 52], np.float32)
    out[shorts] = (brown * np.clip(lum[shorts] * 1.05, .45, 1.3)).clip(0, 255)
    left = rest & ~tank & ~shorts
    if left.any():
        sk = np.median(a[mask & ~bikini[..., 0]], 0)
        out[left] = sk
    # hem lines
    hem = mask & (np.abs(y - yt) < .006 * s) & (A < .4)
    out[hem] *= .6
    belt = mask & (np.abs(y - (yb - .01 * s)) < .012 * s) & (A < .4)
    out[belt] = np.array([58, 40, 26], np.float32) * np.clip(lum[belt], .6, 1.2)[:, :1]
    # fingerless gloves: hand weight high, but leave the finger tips
    tips = sum(jw[:, i] for n, i in nm.items() if n.endswith(('_03_l', '_03_r', '_04_leaf_l', '_04_leaf_r')))
    glove = mask & (H > .6)
    out[glove] = (np.array([60, 44, 30], np.float32) * np.clip(lum[glove] * 1.1, .5, 1.3))
    return Image.fromarray(out.clip(0, 255).astype(np.uint8)), mask


# ---------------------------------------------------------------- build one character
def build_char(name, R, texsize):
    print(name)
    bg = Gltf(os.path.join(SRC, R['body']))
    skel, ibm = bg.skeleton()
    jnames = [s[0] for s in skel]
    prims = []
    for p in bg.prims():
        prims.append(dict(p, part='body' if p['mat'].startswith('MI_Superhero') else p['name'].lower()))
    cloth = []
    for f, keep, skipmat in R['parts']:
        g = Gltf(os.path.join(SRC, f))
        assert g.joint_names() == jnames, f
        for p in g.prims():
            if not any(k in p['name'] for k in keep) or p['mat'] in skipmat:
                continue
            p['part'] = p['name']
            prims.append(p)
            if 'Hair' not in p['name']:
                cloth.append(p)
    body = [p for p in prims if p['part'] == 'body'][0]
    if cloth:
        nb = cull_hidden(body, cloth)
        body.update(nb)
    # ---- textures per material
    mats = {}
    def mat_tex(p):
        if p['part'] == 'body':
            return 'skin'
        if p['mat'] == 'MI_Ranger':
            return 'cloth'
        if p['mat'].startswith('MI_Hair'):
            return 'hair'
        if p['mat'] == 'MI_Eyes':
            return 'eyes'
        return p['mat'].lower()
    for p in prims:
        p['tex'] = mat_tex(p)
    # skin
    skin = tex(R['skin'])
    ssize = 1024
    if R.get('paint'):
        skin, _ = paint_lara(skin, body, ssize)
    else:
        skin = skin.resize((ssize, ssize), Image.LANCZOS)
    mats['skin'] = skin
    # cloth (ranger atlas), recoloured per part inside each part's UV footprint
    if any(p['tex'] == 'cloth' for p in prims):
        c = tex('T_Ranger_BaseColor.png').resize((texsize, texsize), Image.LANCZOS)
        for part, garment in R['cloth'].items():
            ps = [p for p in prims if p['part'] == part]
            if not ps:
                continue
            m, _ = raster_uv([(p['uv'], p['idx'], None) for p in ps], texsize)
            hue, sat, vk = R['colors'][garment]
            c = recolor(c, dilate(m, 3), hue, sat, vk)
        mats['cloth'] = c
    if any(p['tex'] == 'hair' for p in prims):
        hp = [p for p in prims if p['tex'] == 'hair']
        hname = 'T_Hair_2_BaseColor.png' if any('Hair_2' in (p['img'] or '') or p['mat'] == 'MI_Hair_2' for p in hp) else 'T_Hair_1_BaseColor.png'
        h = tex(hname).resize((512, 512), Image.LANCZOS)
        hh, hs, hv = R['hair']
        a = np.asarray(h); H_, S_, V_ = rgb2hsv(a)
        h = Image.fromarray(hsv2rgb(np.full_like(H_, hh), np.minimum(S_ + hs * .5, 1) * 0 + hs, np.clip(V_ * hv * 1.6, 0, 1)))
        mats['hair'] = h
    if any(p['tex'] == 'eyes' for p in prims):
        mats['eyes'] = tex('T_Eye_Brown.png').resize((256, 256), Image.LANCZOS)
    # ---- joints actually used (+ parents)
    used = set()
    for p in prims:
        jt, wt = p['jt'], p['wt']
        used.update(np.unique(jt[wt > 0]).tolist())
    par = {i: (jnames.index(s[1]) if s[1] in jnames else -1) for i, s in enumerate(skel)}
    for nm_ in ('Head', 'hand_r', 'hand_l', 'pelvis', 'spine_03', 'thigh_l', 'thigh_r', 'foot_l', 'foot_r'):
        used.add(jnames.index(nm_))
    for i in list(used):
        while par[i] >= 0:
            i = par[i]; used.add(i)
    order = sorted(used)
    remap = {o: k for k, o in enumerate(order)}
    joints = [dict(n=skel[o][0], p=remap.get(par[o], -1), t=list(map(float, skel[o][2])), r=list(map(float, skel[o][3])), s=list(map(float, skel[o][4]))) for o in order]
    # ---- merge vertices by texture group
    groups = []
    VB = []; IB = []; base = 0
    order_tex = ['skin', 'cloth', 'hair', 'eyes']
    for tname in order_tex + sorted(set(p['tex'] for p in prims) - set(order_tex)):
        ps = [p for p in prims if p['tex'] == tname]
        if not ps:
            continue
        first = len(IB) and sum(len(i) for i in IB)
        cnt = 0
        for p in ps:
            n = len(p['pos'])
            nrm = p['nrm'] / np.maximum(np.linalg.norm(p['nrm'], axis=1, keepdims=True), 1e-9)
            jt = np.vectorize(lambda j: remap.get(int(j), 0))(p['jt']).astype(np.uint8)
            wt = p['wt'] / np.maximum(p['wt'].sum(1, keepdims=True), 1e-9)
            wq = np.round(wt * 255).astype(np.int32)
            wq[:, 0] += 255 - wq.sum(1)
            uv = np.clip(p['uv'], 0, 1)
            rec = np.zeros(n, dtype=[('p', '<f4', 3), ('n', 'i1', 4), ('u', '<u2', 2), ('j', 'u1', 4), ('w', 'u1', 4)])
            rec['p'] = p['pos']; rec['n'][:, :3] = np.round(nrm * 127); rec['u'] = np.round(uv * 65535)
            rec['j'] = jt; rec['w'] = np.clip(wq, 0, 255)
            VB.append(rec.tobytes())
            IB.append((p['idx'] + base).astype('<u4').ravel())
            base += n; cnt += p['idx'].size
        groups.append(dict(mat=tname, tex='trun:%s-%s' % (name, tname), first=int(first), count=int(cnt)))
    vb = b''.join(VB); ib = np.concatenate(IB).astype('<u4').tobytes()
    ibm_used = ibm[order].astype('<f4').tobytes()
    blob = io.BytesIO()
    def put(b):
        while blob.tell() % 4: blob.write(b'\0')
        o = blob.tell(); blob.write(b); return o
    J = dict(joints=joints, groups=groups, verts=base, indices=int(sum(i.size for i in IB)))
    J['ibm'] = put(ibm_used); J['vb'] = put(vb); J['ib'] = put(ib)
    J['height'] = float(max(p['pos'][:, 1].max() for p in prims))
    write_skm(os.path.join(OUT, name + '.skm.gz'), J, blob.getvalue())
    for k, im in mats.items():
        path = os.path.join(OUT, '%s-%s.webp' % (name, k))
        im.save(path, 'WEBP', quality=92, method=6)
        print('  tex', k, im.size, os.path.getsize(path) // 1024, 'KB')
    print('  verts %d tris %d joints %d' % (base, J['indices'] // 3, len(joints)))


def write_skm(path, J, blob):
    js = json.dumps(J, separators=(',', ':')).encode()
    head = b'SKM1' + struct.pack('<I', len(js)) + js
    while len(head) % 4: head += b' '
    data = head + blob
    with gzip.open(path, 'wb', 9) as f:
        f.write(data)
    print('  wrote', os.path.relpath(path, ROOT), len(data) // 1024, 'KB raw', os.path.getsize(path) // 1024, 'KB gz')


# ---------------------------------------------------------------- animations
def qslerp(a, b, t):
    d = (a * b).sum(-1, keepdims=True)
    b = np.where(d < 0, -b, b); d = np.abs(d)
    r = a + (b - a) * t
    return r / np.linalg.norm(r, axis=-1, keepdims=True)


def sample(times, vals, t, quat):
    i = np.searchsorted(times, t, side='right') - 1
    i = np.clip(i, 0, len(times) - 1); j = np.clip(i + 1, 0, len(times) - 1)
    span = np.where(j > i, times[j] - times[i], 1)
    f = np.clip((t - times[i]) / span, 0, 1)[:, None]
    if quat:
        return qslerp(vals[i], vals[j], f)
    return vals[i] + (vals[j] - vals[i]) * f


def build_anims():
    print('anims')
    clips = {}
    names = None
    for f in ('anims/UAL1_Standard.glb', 'anims/UAL2_Standard.glb'):
        g = Gltf(os.path.join(SRC, f))
        if names is None:
            names = g.joint_names()
            rest = [dict(n=k[0], t=list(map(float, k[2])), r=list(map(float, k[3]))) for k in g.skeleton()[0]]
        clips.update(g.anims())
    fps = 30
    blob = io.BytesIO(); out = []
    def put(b):
        while blob.tell() % 4: blob.write(b'\0')
        o = blob.tell(); blob.write(b); return o
    # rest pelvis height of the animation mannequin: game scales pelvis motion by body/mannequin
    for gname, (src, loop) in CLIPS.items():
        ch = clips[src]
        dur = max(v[0][-1] for c in ch.values() for v in c.values())
        frames = max(2, int(round(dur * fps)) + (0 if loop else 1))
        t = np.arange(frames) / fps
        if loop:
            t = t * (dur / (frames / fps)) if frames > 1 else t
        rot = np.zeros((frames, len(names), 4), np.float32)
        for k, n in enumerate(names):
            if n in ch and 'rotation' in ch[n]:
                tt, vv = ch[n]['rotation']
                rot[:, k] = sample(tt, vv.astype(np.float32), t, True)
            else:
                rot[:, k] = [0, 0, 0, 1]
        # keep quaternions in one hemisphere frame to frame
        for fi in range(1, frames):
            flip = (rot[fi] * rot[fi - 1]).sum(-1) < 0
            rot[fi][flip] *= -1
        pel = np.zeros((frames, 3), np.float32)
        if 'pelvis' in ch and 'translation' in ch['pelvis']:
            tt, vv = ch['pelvis']['translation']
            pel = sample(tt, vv.astype(np.float32), t, False).astype(np.float32)
        q = np.round(rot * 32767).astype('<i2').tobytes()
        out.append(dict(n=gname, src=src, frames=frames, loop=loop, dur=float(dur), rot=put(q), pel=put(pel.astype('<f4').tobytes())))
        print('  %-11s %-20s %3d frames %.2fs' % (gname, src, frames, dur))
    J = dict(fps=fps, joints=names, rest=rest, clips=out)
    write_skm(os.path.join(OUT, 'anims.skm.gz'), J, blob.getvalue())


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--tex', type=int, default=2048)
    ap.add_argument('--no-anims', action='store_true')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    for n, R in RECIPES.items():
        if a.only and n not in a.only.split(','):
            continue
        build_char(n, R, a.tex)
    if not a.no_anims and (not a.only or 'anims' in a.only):
        build_anims()
