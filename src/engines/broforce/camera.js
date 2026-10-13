// BF-19: pure, shared-world camera. All positions are WORLD PIXELS; dt is seconds.
// camera.x/y denote the TOP-LEFT world coordinate of the full canvas (not the HUD
// safe rect). x/y in player bodies are top-left; w/h are optional world pixels.
// No DOM, screen rotation, input ownership or gameplay state is touched here.
const BF_CAMERA_MIN_ZOOM = 1.6; // 18px source heads remain >=28px on screen.
const BF_CAMERA_MAX_ZOOM = 2.5;
const BF_CAMERA_MAX_WORLD = 1e8;
const BF_CAMERA_MAX_VIEW = 1e5;
const BF_CAMERA_MAX_DT = 0.1;

const bfFinite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const bfClamp = (value, low, high) => Math.min(high, Math.max(low, value));
const bfSize = (value, fallback, maximum) => bfClamp(bfFinite(value, fallback), 1, maximum);

function createBroforceCamera({x = 0, y = 0, zoom = 1} = {}) {
  return {
    x: bfClamp(bfFinite(x), -BF_CAMERA_MAX_WORLD, BF_CAMERA_MAX_WORLD),
    y: bfClamp(bfFinite(y), -BF_CAMERA_MAX_WORLD, BF_CAMERA_MAX_WORLD),
    zoom: bfClamp(zoom > 0 && Number.isFinite(zoom) ? zoom : 1, 0.01, 100)
  };
}

// Center short stages rather than pinning the camera to one edge. A stage
// larger than the visible world span cannot scroll beyond either stage end.
function bfBoundAxis(position, worldSize, viewSizeWorld) {
  if (worldSize <= viewSizeWorld) return (worldSize - viewSizeWorld) * 0.5;
  return bfClamp(position, 0, worldSize - viewSizeWorld);
}

function bfLiveBody(player) {
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return null;
  // Boarding is terminal for camera targeting even when the mission retains
  // alive=true and the old world coordinates for its extraction receipt.
  // Likewise a downed/dying body is not an active viewpoint anchor.
  if (player.alive === false || player.dead === true || player.isDead === true ||
      player.down === true || player.downed === true || player.dying === true ||
      player.defeated === true || player.boarded === true || player.extracted === true ||
      ('hp' in player && (!Number.isFinite(player.hp) || player.hp <= 0)) ||
      ('health' in player && (!Number.isFinite(player.health) || player.health <= 0)) ||
      (typeof player.status === 'string' && /^(dead|down|downed|dying|defeated|respawning|boarded|extracted)$/i.test(player.status)) ||
      (typeof player.state === 'string' && /^(dead|down|downed|dying|defeated|respawning|boarded|extracted)$/i.test(player.state))) return null;
  const w = bfClamp(bfFinite(player.w, 0), 0, 1024);
  const h = bfClamp(bfFinite(player.h, 0), 0, 1024);
  const x = bfClamp(player.x, -BF_CAMERA_MAX_WORLD, BF_CAMERA_MAX_WORLD);
  const y = bfClamp(player.y, -BF_CAMERA_MAX_WORLD, BF_CAMERA_MAX_WORLD);
  return {left:x, right:x+w, top:y, bottom:y+h,
    cx:x+w*0.5, cy:y+h*0.5,
    vx:bfClamp(bfFinite(player.vx), -10000, 10000),
    vy:bfClamp(bfFinite(player.vy), -10000, 10000)};
}

function bfFitPosition(wanted, minBody, maxBody, minScreen, maxScreen, scale) {
  // Each body must lie inside the safe screen interval, expressed in world
  // units. If impossible at this zoom, favor the midpoint of the group.
  const low = maxBody - maxScreen / scale;
  const high = minBody - minScreen / scale;
  return low <= high ? bfClamp(wanted, low, high) :
    (minBody + maxBody) * 0.5 - (minScreen + maxScreen) * 0.5 / scale;
}

function advanceBroforceCamera(camera, {players = [], viewport = {}, world = {}, dt = 0, controlsInset = 0, hudInset = 0} = {}) {
  const prev = createBroforceCamera(camera || {});
  const width = bfSize(viewport && viewport.width, 390, BF_CAMERA_MAX_VIEW);
  const height = bfSize(viewport && viewport.height, 780, BF_CAMERA_MAX_VIEW);
  const worldW = bfSize(world && world.width, width, BF_CAMERA_MAX_WORLD);
  const worldH = bfSize(world && world.height, height, BF_CAMERA_MAX_WORLD);
  const inset = bfClamp(bfFinite(controlsInset), 0, Math.max(0, height - 96));
  const marginX = Math.min(30, width * 0.12);
  const marginTop = Math.min(44, height * 0.12);
  const marginBottom = Math.min(30, Math.max(8, (height - inset) * 0.10));
  // Degenerate small-viewport inputs still yield a valid invertible camera.
  const safeX0 = Math.min(marginX, width * 0.25);
  const safeX1 = Math.max(safeX0 + 1, width - safeX0);
  // hudInset is the canvas HUD's reserved top band (last frame); keep heads below it.
  const hud = bfClamp(bfFinite(hudInset), 0, height * 0.35);
  const safeY0 = Math.max(Math.min(marginTop, height * 0.3), hud ? hud + 6 : 0);
  const safeY1 = Math.max(safeY0 + 1, height - inset - marginBottom);
  const safeW = safeX1 - safeX0;
  const safeH = safeY1 - safeY0;
  const bodies = (Array.isArray(players) ? players : []).map(bfLiveBody).filter(Boolean);
  // For no living players, hold the camera pose; only constrain after resizing.
  if (!bodies.length) {
    const zoom = bfClamp(prev.zoom, 0.01, 100);
    return {x:bfBoundAxis(prev.x, worldW, width/zoom),
      y:bfBoundAxis(prev.y, worldH, height/zoom), zoom, tetherExceeded:false};
  }

  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  let meanVX = 0, meanVY = 0;
  for (const p of bodies) {
    left = Math.min(left, p.left); right = Math.max(right, p.right);
    top = Math.min(top, p.top); bottom = Math.max(bottom, p.bottom);
    meanVX += p.vx; meanVY += p.vy;
  }
  meanVX /= bodies.length; meanVY /= bodies.length;

  const spanX = right - left, spanY = bottom - top;
  // Do not chase frame-to-frame noise at the limit. Extra world-space framing
  // room gives traversal and jumps time before a hard camera correction.
  // Short landscape phones: aim for ~150 world px of height between HUD and
  // thumbs, never below the head-readability floor.
  const nominalZoom = Math.min(width < 520 ? 2.0 : width < 900 ? 2.2 : 2.35,
    Math.max(BF_CAMERA_MIN_ZOOM, safeH / 150));
  const requestedZoom = bfClamp(Math.min(nominalZoom,
    safeW / Math.max(1, spanX + 32),
    safeH / Math.max(1, spanY + 24)), BF_CAMERA_MIN_ZOOM, BF_CAMERA_MAX_ZOOM);
  const seconds = bfClamp(bfFinite(dt), 0, BF_CAMERA_MAX_DT);
  const zoomEase = 1 - Math.exp(-seconds / 0.22);
  let zoom = prev.zoom + (requestedZoom - prev.zoom) * zoomEase;
  // A stale zoom must not hide a reachable teammate: reduce it just enough
  // to fit all living players if feasible at the readability floor.
  const fitZoom = Math.min(safeW/Math.max(spanX, 1e-9), safeH/Math.max(spanY, 1e-9));
  if (bodies.length > 1 && fitZoom >= BF_CAMERA_MIN_ZOOM) zoom = Math.min(zoom, fitZoom);
  zoom = bfClamp(zoom, 0.01, BF_CAMERA_MAX_ZOOM);
  const tetherExceeded = bodies.length > 1 &&
    (spanX > safeW / BF_CAMERA_MIN_ZOOM + 1e-8 ||
     spanY > safeH / BF_CAMERA_MIN_ZOOM + 1e-8);

  // Smooth midpoint tracking with modest motion lookahead. Camera framing
  // observes overlay clearance; a HUD/control inset is NOT a cropped canvas.
  const midX = (left + right) * 0.5;
  const midY = (top + bottom) * 0.5;
  const lookX = bfClamp(meanVX * 0.18, -Math.min(44, safeW/zoom * 0.18), Math.min(44, safeW/zoom * 0.18));
  const lookY = bfClamp(meanVY * 0.08, -Math.min(24, safeH/zoom * 0.15), Math.min(24, safeH/zoom * 0.15));
  // Smooth *world-space focus* instead of the top-left offset; the latter
  // shifts when zoom changes, producing different 30/60 Hz tracking paths.
  const screenCX = (safeX0 + safeX1) * 0.5;
  const screenCY = (safeY0 + safeY1) * 0.5;
  const oldFocusX = prev.x + screenCX / prev.zoom;
  const oldFocusY = prev.y + screenCY / prev.zoom;
  const followEase = 1 - Math.exp(-seconds / 0.14);
  let x = oldFocusX + (midX + lookX - oldFocusX) * followEase - screenCX / zoom;
  let y = oldFocusY + (midY + lookY - oldFocusY) * followEase - screenCY / zoom;

  // Keep the whole player rectangle safely onscreen when mathematically
  // possible, even while the smooth camera is catching up to a new location.
  x = bfFitPosition(x, left, right, safeX0, safeX1, zoom);
  y = bfFitPosition(y, top, bottom, safeY0, safeY1, zoom);
  x = bfBoundAxis(x, worldW, width / zoom);
  // The touch controls cover the bottom of the canvas. Let the camera look
  // below the world floor by that much (the renderer fills it with bedrock)
  // so fighters on the lowest row stay above the thumbs instead of under them.
  // A world that fits the view stays centred unless that would put its floor
  // under the controls; then it is raised just enough to clear them.
  const below = inset > 0 ? (inset + marginBottom) / zoom : 0;
  const viewH = height / zoom;
  y = worldH + below <= viewH ? Math.max((worldH - viewH) * 0.5, worldH + below - viewH) :
    bfClamp(y, Math.min(0, (worldH - viewH) * 0.5), worldH + below - viewH);
  return {x, y, zoom, tetherExceeded};
}

function broforceWorldToScreen(camera, viewport, x, y) {
  const c = createBroforceCamera(camera || {});
  // Viewport is intentionally not an offset: the full game canvas is visible.
  // Keeping it in this API makes rotation/resizes share one transform contract.
  return {x:(bfFinite(x) - c.x) * c.zoom, y:(bfFinite(y) - c.y) * c.zoom};
}

function broforceScreenToWorld(camera, viewport, x, y) {
  const c = createBroforceCamera(camera || {});
  return {x:bfFinite(x) / c.zoom + c.x, y:bfFinite(y) / c.zoom + c.y};
}

Object.assign(exports, {createBroforceCamera, advanceBroforceCamera,
  broforceWorldToScreen, broforceScreenToWorld});
