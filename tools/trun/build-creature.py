# Temple Run (Boulder Run revamp): animated creature chasers (Quaternius CC0 "Animated Lowpoly Dinosaurs" etc.).
# The packs ship FBX only: convert first with FBX2glTF (npm package fbx2gltf, binary in node_modules/fbx2gltf/bin/Linux):
#   FBX2glTF -b -i Trex.fbx -o trex      -> trex.glb
# then:  python3 tools/trun/build-creature.py trex /path/to/trex.glb [--height 5.2]
# Writes assets/trun/<name>.skm.gz (mesh + its own clips in one file: 'clips', 'fps', 'rest', 'rootMotion') and
# assets/trun/<name>-pal.webp (one colour cell per material: these models have flat material colours, no textures).
# The skeleton's parent nodes (Armature scale/rotation) are baked into the root joint so the game's rig (skel.js) works
# from the root joint alone; the body joint's translation track becomes root motion (the bob of the run).
import argparse, gzip, io, json, os, struct, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from gltf import Gltf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'trun')


def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return np.array([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz])


def qrot(q, v):
    u = np.array(q[:3]); s = q[3]
    return 2 * np.dot(u, v) * u + (s * s - np.dot(u, u)) * v + 2 * s * np.cross(u, v)


def trs(t, r, s):
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
                  [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
                  [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s)[None, :]; M[:3, 3] = t
    return M


def sample(times, vals, t, quat):
    i = np.clip(np.searchsorted(times, t, side='right') - 1, 0, len(times) - 1)
    j = np.clip(i + 1, 0, len(times) - 1)
    span = np.where(j > i, times[j] - times[i], 1)
    f = np.clip((t - times[i]) / span, 0, 1)[:, None]
    a, b = vals[i], vals[j]
    if quat:
        d = (a * b).sum(-1, keepdims=True); b = np.where(d < 0, -b, b)
        r = a + (b - a) * f
        return r / np.linalg.norm(r, axis=-1, keepdims=True)
    return a + (b - a) * f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('name'); ap.add_argument('glb')
    ap.add_argument('--height', type=float, default=0, help='scale so the bind pose is this tall (metres)')
    ap.add_argument('--motion', default='Body', help='joint whose translation track is kept as root motion')
    ap.add_argument('--prefix', default='', help='strip this from clip names (after the "|")')
    a = ap.parse_args()
    g = Gltf(a.glb); j = g.j; nodes = j['nodes']
    skin = j['skins'][0]; jidx = skin['joints']
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []):
            parent[c] = i
    ibm_all = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)  # row-major 4x4
    # topological order of the skin's joints (parents first)
    jset = set(jidx); order = []
    def visit(n):
        if n in order: return
        p = parent.get(n)
        if p in jset: visit(p)
        order.append(n)
    for n in jidx: visit(n)
    pos_of = {n: k for k, n in enumerate(jidx)}
    # matrix of everything above the root joint(s)
    def above(n):
        M = np.eye(4); p = parent.get(n)
        while p is not None:
            pn = nodes[p]; M = trs(pn.get('translation', [0, 0, 0]), pn.get('rotation', [0, 0, 0, 1]), pn.get('scale', [1, 1, 1])) @ M
            p = parent.get(p)
        return M
    roots = [n for n in order if parent.get(n) not in jset]
    assert len(roots) == 1, roots
    P = above(roots[0])
    ps = float(np.cbrt(abs(np.linalg.det(P[:3, :3]))))
    Pr = P[:3, :3] / ps
    # quaternion of Pr
    m = Pr; tr = m[0, 0] + m[1, 1] + m[2, 2]
    if tr > 0:
        S = np.sqrt(tr + 1) * 2; pq = np.array([(m[2, 1] - m[1, 2]) / S, (m[0, 2] - m[2, 0]) / S, (m[1, 0] - m[0, 1]) / S, .25 * S])
    else:
        k = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]]))
        if k == 0:
            S = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; pq = np.array([.25 * S, (m[0, 1] + m[1, 0]) / S, (m[0, 2] + m[2, 0]) / S, (m[2, 1] - m[1, 2]) / S])
        elif k == 1:
            S = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; pq = np.array([(m[0, 1] + m[1, 0]) / S, .25 * S, (m[1, 2] + m[2, 1]) / S, (m[0, 2] - m[2, 0]) / S])
        else:
            S = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; pq = np.array([(m[0, 2] + m[2, 0]) / S, (m[1, 2] + m[2, 1]) / S, .25 * S, (m[1, 0] - m[0, 1]) / S])
    pq = pq / np.linalg.norm(pq)
    names = [nodes[n]['name'] for n in order]
    joints = []
    for n in order:
        nd = nodes[n]; t = np.array(nd.get('translation', [0, 0, 0]), float); r = np.array(nd.get('rotation', [0, 0, 0, 1]), float); s = np.array(nd.get('scale', [1, 1, 1]), float)
        p = parent.get(n)
        if n == roots[0]:
            t = P[:3, :3] @ t + P[:3, 3]; r = qmul(pq, r); s = s * ps
        joints.append(dict(n=nd['name'], p=order.index(p) if p in jset else -1, t=t.tolist(), r=r.tolist(), s=s.tolist()))
    # bind pose world matrices (rebuilt from the baked joints) -> skinned bind positions, for the height/scale
    W = []
    for k, jt in enumerate(joints):
        L = trs(jt['t'], jt['r'], jt['s'])
        W.append(L if jt['p'] < 0 else W[jt['p']] @ L)
    # the original ibms were made against the un-baked world (P * ...): same thing, so they stay valid
    ibm = np.stack([ibm_all[pos_of[n]] for n in order])
    prims = g.prims()
    mats = j.get('materials', [])
    allv = []
    for p in prims:
        jt = p['jt']; wt = p['wt'] / np.maximum(p['wt'].sum(1, keepdims=True), 1e-9)
        v4 = np.c_[p['pos'], np.ones(len(p['pos']))]
        out = np.zeros((len(v4), 3))
        for c in range(4):
            Ms = np.stack([W[order.index(jidx[int(x)])] @ ibm[order.index(jidx[int(x)])] for x in jt[:, c]])
            out += wt[:, c:c + 1] * np.einsum('nij,nj->ni', Ms, v4)[:, :3]
        allv.append(out)
    allv = np.concatenate(allv)
    lo, hi = allv.min(0), allv.max(0)
    print('bind bbox', lo.round(3), hi.round(3))
    height = hi[1] - lo[1]
    k = a.height / height if a.height else 1.0
    if k != 1.0:  # scale the whole skeleton (root joint) and the root motion
        joints[0]['s'] = (np.array(joints[0]['s']) * k).tolist()
        joints[0]['t'] = (np.array(joints[0]['t']) * k).tolist()
        lo, hi = lo * k, hi * k
    # palette: one 8x8 cell per material
    cells = len(mats); pal = Image.new('RGB', (8 * max(1, cells), 8))
    for i, mt in enumerate(mats):
        c = mt.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])
        srgb = tuple(int(round(min(1, max(0, v)) ** (1 / 2.2) * 255)) for v in c[:3])
        for x in range(8):
            for y in range(8):
                pal.putpixel((i * 8 + x, y), srgb)
    remap = {n: order.index(n) for n in jidx}
    VB = []; IB = []; base = 0
    for p in prims:
        n = len(p['pos'])
        nrm = p['nrm'] / np.maximum(np.linalg.norm(p['nrm'], axis=1, keepdims=True), 1e-9)
        jt = np.vectorize(lambda x: remap[jidx[int(x)]])(p['jt']).astype(np.uint8)
        wt = p['wt'] / np.maximum(p['wt'].sum(1, keepdims=True), 1e-9)
        wq = np.round(wt * 255).astype(np.int32); wq[:, 0] += 255 - wq.sum(1)
        u = (p['matIndex'] * 8 + 4) / pal.width
        rec = np.zeros(n, dtype=[('p', '<f4', 3), ('n', 'i1', 4), ('u', '<u2', 2), ('j', 'u1', 4), ('w', 'u1', 4)])
        rec['p'] = p['pos']; rec['n'][:, :3] = np.round(nrm * 127); rec['u'][:, 0] = round(u * 65535); rec['u'][:, 1] = 32767
        rec['j'] = jt; rec['w'] = np.clip(wq, 0, 255)
        VB.append(rec.tobytes()); IB.append((p['idx'] + base).astype('<u4').ravel()); base += n
    vb = b''.join(VB); ib = np.concatenate(IB).astype('<u4').tobytes()
    blob = io.BytesIO()
    def put(b):
        while blob.tell() % 4: blob.write(b'\0')
        o = blob.tell(); blob.write(b); return o
    ibm_cm = ibm.transpose(0, 2, 1).astype('<f4').tobytes()  # back to column-major
    J = dict(joints=joints, groups=[dict(mat='pal', tex='trun:%s-pal' % a.name, first=0, count=int(sum(i.size for i in IB)))],
             verts=base, indices=int(sum(i.size for i in IB)), height=float(hi[1] - lo[1]), bbox=[lo.tolist(), hi.tolist()],
             rootMotion=a.motion)
    J['ibm'] = put(ibm_cm); J['vb'] = put(vb); J['ib'] = put(ib)
    # clips (same layout as anims.skm.gz)
    fps = 30; clips = []
    for cname, ch in g.anims().items():
        nm = cname.split('|')[-1]
        if a.prefix and nm.startswith(a.prefix): nm = nm[len(a.prefix):]
        nm = nm.lower()
        dur = max(v[0][-1] for c in ch.values() for v in c.values())
        loop = nm in ('run', 'walk', 'idle', 'gallop', 'swim', 'fly')
        frames = max(2, int(round(dur * fps)) + (0 if loop else 1))
        t = np.arange(frames) / fps
        if loop: t = t * (dur / (frames / fps))
        rot = np.zeros((frames, len(names), 4), np.float32)
        for kk, n in enumerate(names):
            if n in ch and 'rotation' in ch[n]:
                tt, vv = ch[n]['rotation']; rr = sample(tt, vv.astype(np.float64), t, True)
                if kk == 0: rr = np.stack([qmul(pq, q) for q in rr])
                rot[:, kk] = rr
            else:
                rot[:, kk] = joints[kk]['r']
        for fi in range(1, frames):
            flip = (rot[fi] * rot[fi - 1]).sum(-1) < 0; rot[fi][flip] *= -1
        pel = np.tile(np.array(joints[names.index(a.motion)]['t'], np.float32), (frames, 1)) if a.motion in names else np.zeros((frames, 3), np.float32)
        if a.motion in ch and 'translation' in ch[a.motion]:
            tt, vv = ch[a.motion]['translation']; pel = sample(tt, vv.astype(np.float64), t, False).astype(np.float32)
        clips.append(dict(n=nm, frames=frames, loop=loop, dur=float(dur), rot=put(np.round(rot * 32767).astype('<i2').tobytes()), pel=put(pel.astype('<f4').tobytes())))
        print('  clip %-8s %3d frames %.2fs%s' % (nm, frames, dur, ' loop' if loop else ''))
    J['fps'] = fps; J['clipJoints'] = names; J['clips'] = clips
    J['rest'] = [dict(n=x['n'], t=x['t'], r=x['r']) for x in joints]
    js = json.dumps(J, separators=(',', ':')).encode()
    head = b'SKM1' + struct.pack('<I', len(js)) + js
    while len(head) % 4: head += b' '
    os.makedirs(OUT, exist_ok=True)
    with gzip.open(os.path.join(OUT, a.name + '.skm.gz'), 'wb', 9) as f: f.write(head + blob.getvalue())
    pal.save(os.path.join(OUT, a.name + '-pal.webp'), 'WEBP', lossless=True)
    print('wrote', a.name, 'verts', base, 'joints', len(joints), 'height %.2f' % (hi[1] - lo[1]),
          os.path.getsize(os.path.join(OUT, a.name + '.skm.gz')) // 1024, 'KB')


if __name__ == '__main__':
    main()
