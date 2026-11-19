# Minimal glTF 2.0 reader for the Temple Run character pipeline (Quaternius CC0 packs).
# Reads .gltf (+ .bin) and .glb: nodes, skins, skinned mesh primitives and animations as numpy arrays.
import json, struct, os
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class Gltf:
    def __init__(self, path):
        self.path = path
        self.dir = os.path.dirname(path)
        if path.endswith('.glb'):
            b = open(path, 'rb').read()
            off = 12
            self.bufs = []
            while off < len(b):
                ln, kind = struct.unpack('<II', b[off:off + 8])
                chunk = b[off + 8:off + 8 + ln]
                if kind == 0x4E4F534A:
                    self.j = json.loads(chunk)
                else:
                    self.bufs.append(chunk)
                off += 8 + ln
        else:
            self.j = json.load(open(path))
            self.bufs = [open(os.path.join(self.dir, b['uri']), 'rb').read() for b in self.j['buffers']]

    def acc(self, i):
        a = self.j['accessors'][i]
        v = self.j['bufferViews'][a['bufferView']]
        buf = self.bufs[v['buffer']]
        dt = np.dtype(CT[a['componentType']])
        n = NC[a['type']]
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = v.get('byteStride', 0)
        cnt = a['count']
        if stride and stride != n * dt.itemsize:
            raw = np.frombuffer(buf, np.uint8, cnt * stride, off).reshape(cnt, stride)[:, :n * dt.itemsize]
            out = np.frombuffer(raw.tobytes(), dt).reshape(cnt, n)
        else:
            out = np.frombuffer(buf, dt, cnt * n, off).reshape(cnt, n)
        if a.get('normalized'):
            out = out.astype(np.float32) / np.iinfo(dt).max
        return out

    def joint_names(self):
        s = self.j['skins'][0]
        return [self.j['nodes'][i]['name'] for i in s['joints']]

    def skeleton(self):
        """[(name, parent_name, t, r, s)] in skin joint order + inverse bind matrices (n,4,4 column-major as in glTF)."""
        nodes = self.j['nodes']
        s = self.j['skins'][0]
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get('children', []):
                parent[c] = i
        out = []
        for ji in s['joints']:
            n = nodes[ji]
            p = parent.get(ji)
            out.append((n['name'], nodes[p]['name'] if p is not None else None,
                        n.get('translation', [0, 0, 0]), n.get('rotation', [0, 0, 0, 1]), n.get('scale', [1, 1, 1])))
        ibm = self.acc(s['inverseBindMatrices']).reshape(-1, 4, 4)
        return out, ibm

    def prims(self):
        """Skinned primitives: dicts with name, material name, image uri of base colour, arrays."""
        j = self.j
        names = self.joint_names()
        out = []
        for n in j['nodes']:
            if 'mesh' not in n:
                continue
            m = j['meshes'][n['mesh']]
            for pr in m['primitives']:
                at = pr['attributes']
                mat = j['materials'][pr['material']]
                img = None
                bc = mat.get('pbrMetallicRoughness', {}).get('baseColorTexture')
                if bc is not None:
                    img = j['images'][j['textures'][bc['index']]['source']]['uri']
                d = dict(name=n['name'], mat=mat['name'], img=img,
                         pos=self.acc(at['POSITION']).astype(np.float32),
                         nrm=self.acc(at['NORMAL']).astype(np.float32),
                         uv=self.acc(at['TEXCOORD_0']).astype(np.float32),
                         jt=self.acc(at['JOINTS_0']).astype(np.int32),
                         wt=self.acc(at['WEIGHTS_0']).astype(np.float32),
                         idx=self.acc(pr['indices']).astype(np.int64).reshape(-1, 3),
                         joints=names)
                out.append(d)
        return out

    def anims(self):
        """{name: {node_name: {path: (times, values)}}}"""
        j = self.j
        out = {}
        for a in j.get('animations', []):
            ch = {}
            for c in a['channels']:
                s = a['samplers'][c['sampler']]
                nn = j['nodes'][c['target']['node']]['name']
                ch.setdefault(nn, {})[c['target']['path']] = (self.acc(s['input'])[:, 0], self.acc(s['output']))
            out[a['name']] = ch
        return out
