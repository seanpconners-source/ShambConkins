# ShambConkins

A single-file, offline browser party/board game. This repo holds the **source**; the
shippable game is generated.

```
node tools/build.mjs            # -> dist/ShambConkins.html (open in any browser)
```

Layout: `src/` (132 CommonJS-style modules, `modules.json` = load order), `src/styles.css`,
`src/index.template.html`, `assets/` (images; referenced in code as `@@asset:assets/x.svg@@`
and inlined at build time). No dependencies.

The first commit is a lossless split of the v0.43.1 file: building it reproduces the
original HTML byte-for-byte (SHA-256 `3f712823…f076`).
