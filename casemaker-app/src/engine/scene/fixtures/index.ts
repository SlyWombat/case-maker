import * as THREE from 'three';
import type { ComponentKind, Facing } from '@/types';
import {
  fixtureGroup,
  box,
  placeAt,
  cylinder,
  bboxCenter,
  depthAxisForFacing,
  alignCylinderToDepth,
  frontFaceCenter,
  type FixtureSize,
} from './_common';

/** Issue #99 — fixture builders now take `facing` so asymmetric features
 *  (recesses, latches, pin patterns, body cylinders) can orient themselves
 *  along the connector's actual depth axis instead of the canonical +X or +Y
 *  the original code happened to assume. */
export type FixtureBuilder = (size: FixtureSize, facing: Facing) => THREE.Group;

/**
 * Procedural fixture builders for board / HAT components. Each builder produces
 * a group that fills the requested bounding box (so it slots in wherever the
 * plain placeholder block went). Tier 1 of issue #39 — recognisable shapes,
 * no external assets required.
 */

/**
 * Build a recessed-throat port (USB-A / USB-B / micro-USB / HDMI / micro-HDMI).
 * The metal shell fills the bbox; the dark "throat" recess sits at the FRONT
 * face for the requested facing so the cable opening points outward.
 */
function buildPort(
  size: FixtureSize,
  facing: Facing,
  body: { color: string },
  opening: { color: string },
): THREE.Group {
  const g = fixtureGroup('port');
  const [cx, cy, cz] = bboxCenter(size);
  g.add(placeAt(box(size, body.color, { metalness: 0.7, roughness: 0.35 }), cx, cy, cz));
  const depth = depthAxisForFacing(facing, size);
  // Recess size: shrink along ALL axes so it sits inside the shell, then
  // truncate the depth side so it only fills the front half of the body.
  const innerSize: FixtureSize = {
    x: Math.max(0.5, size.x - Math.min(1.5, size.x * 0.2)),
    y: Math.max(0.5, size.y - Math.min(1.5, size.y * 0.2)),
    z: Math.max(0.5, size.z - Math.min(1.5, size.z * 0.5)),
  };
  // Truncate the recess to the front half of the depth axis so the throat
  // is visibly INSIDE the shell rather than filling its full depth.
  if (depth.axis === 'x') innerSize.x = Math.max(0.4, size.x * 0.6);
  else if (depth.axis === 'y') innerSize.y = Math.max(0.4, size.y * 0.6);
  else innerSize.z = Math.max(0.4, size.z * 0.6);
  const inner = box(innerSize, opening.color, { metalness: 0.1, roughness: 0.85 });
  // Position the recess at the FRONT face, inset by half its depth so the
  // recess box sits flush with the front face plane.
  const insetByHalfRecessDepth =
    depth.axis === 'x' ? innerSize.x / 2 : depth.axis === 'y' ? innerSize.y / 2 : innerSize.z / 2;
  const [fx, fy, fz] = frontFaceCenter(facing, size, insetByHalfRecessDepth);
  inner.position.set(fx, fy, fz);
  g.add(inner);
  return g;
}

const buildUsbA: FixtureBuilder = (size, facing) =>
  buildPort(size, facing, { color: '#a5a8ad' }, { color: '#1c1c1c' });

const buildUsbB: FixtureBuilder = (size, facing) =>
  buildPort(size, facing, { color: '#a5a8ad' }, { color: '#1c1c1c' });

const buildUsbC: FixtureBuilder = (size, facing) => {
  const g = fixtureGroup('usb-c');
  const [cx, cy, cz] = bboxCenter(size);
  g.add(placeAt(box(size, '#bcbcbc', { metalness: 0.75, roughness: 0.3 }), cx, cy, cz));
  // Oval-ish dark recess at the front face.
  const depth = depthAxisForFacing(facing, size);
  const slotSize: FixtureSize = {
    x: Math.max(0.6, size.x * (depth.axis === 'x' ? 0.5 : 0.55)),
    y: Math.max(0.6, size.y * (depth.axis === 'y' ? 0.5 : 0.55)),
    z: Math.max(0.6, size.z * 0.5),
  };
  const slot = box(slotSize, '#0e0e0e', { metalness: 0.05, roughness: 0.95 });
  const inset =
    depth.axis === 'x' ? slotSize.x / 2 : depth.axis === 'y' ? slotSize.y / 2 : slotSize.z / 2;
  const [fx, fy, fz] = frontFaceCenter(facing, size, inset);
  slot.position.set(fx, fy, fz);
  g.add(slot);
  return g;
};

const buildMicroUsb: FixtureBuilder = (size, facing) =>
  buildPort(size, facing, { color: '#a5a8ad' }, { color: '#1c1c1c' });

const buildHdmi: FixtureBuilder = (size, facing) =>
  buildPort(size, facing, { color: '#2a2a2a' }, { color: '#0a0a0a' });

const buildMicroHdmi: FixtureBuilder = (size, facing) =>
  buildPort(size, facing, { color: '#2a2a2a' }, { color: '#0a0a0a' });

const buildBarrelJack: FixtureBuilder = (size, facing) => {
  const g = fixtureGroup('barrel-jack');
  const [cx, cy, cz] = bboxCenter(size);
  // Plastic body
  g.add(placeAt(box(size, '#1c1c1c', { metalness: 0.05, roughness: 0.9 }), cx, cy, cz));
  // Cylindrical socket along the depth axis, opening at the front face.
  const depth = depthAxisForFacing(facing, size);
  const r = Math.min(depth.perpSize.wide, depth.perpSize.tall) * 0.32;
  const socketLen = Math.max(0.5, depth.length * 0.35);
  const cyl = cylinder(r, socketLen, '#3a3a3a');
  alignCylinderToDepth(cyl, depth);
  // Center the socket cylinder at the front face, inset by half its length.
  const [fx, fy, fz] = frontFaceCenter(facing, size, socketLen / 2);
  cyl.position.set(fx, fy, fz);
  g.add(cyl);
  return g;
};

const buildRj45: FixtureBuilder = (size, facing) => {
  const g = fixtureGroup('rj45');
  const [cx, cy, cz] = bboxCenter(size);
  g.add(placeAt(box(size, '#c4a85a', { metalness: 0.6, roughness: 0.45 }), cx, cy, cz));
  // Plastic latch slot at the front face.
  const depth = depthAxisForFacing(facing, size);
  const latchSize: FixtureSize = {
    x: Math.max(0.6, size.x * (depth.axis === 'x' ? 0.4 : 0.6)),
    y: Math.max(0.6, size.y * (depth.axis === 'y' ? 0.4 : 0.6)),
    z: Math.max(0.6, size.z * 0.55),
  };
  const latch = box(latchSize, '#1a1a1a', { metalness: 0.05, roughness: 0.95 });
  const inset =
    depth.axis === 'x' ? latchSize.x / 2 : depth.axis === 'y' ? latchSize.y / 2 : latchSize.z / 2;
  const [fx, fy, fz] = frontFaceCenter(facing, size, inset);
  latch.position.set(fx, fy, fz);
  g.add(latch);
  return g;
};

const buildPinHeader: FixtureBuilder = (size, _facing) => {
  void _facing; // pin headers are radially symmetric in their bbox plane
  const g = fixtureGroup('pin-header');
  // Black plastic strip occupies the bottom 30% of the requested size.
  const strikeZ = size.z * 0.3;
  g.add(
    placeAt(box({ x: size.x, y: size.y, z: strikeZ }, '#0e0e0e', { metalness: 0.05, roughness: 0.95 }),
      size.x / 2,
      size.y / 2,
      strikeZ / 2,
    ),
  );
  // Tile 2.54mm pins above the plastic strip; pin height fills the remaining
  // 70% so the union bbox equals `size` exactly (issue #42 fixture-bbox fix).
  const PITCH = 2.54;
  const pinHeight = size.z - strikeZ;
  const cols = Math.max(1, Math.round(size.x / PITCH));
  const rows = Math.max(1, Math.round(size.y / PITCH));
  // Cap rows × cols so we don't allocate thousands of meshes for very wide
  // headers that the user can't visually distinguish anyway.
  const MAX = 80;
  const totalNominal = cols * rows;
  const skip = totalNominal > MAX ? Math.ceil(totalNominal / MAX) : 1;
  let drawn = 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if ((i * rows + j) % skip !== 0) continue;
      const pin = box(
        { x: 0.6, y: 0.6, z: pinHeight },
        '#d4af37',
        { metalness: 0.85, roughness: 0.25 },
      );
      pin.position.set(
        (i + 0.5) * (size.x / cols),
        (j + 0.5) * (size.y / rows),
        strikeZ + pinHeight / 2,
      );
      g.add(pin);
      drawn++;
      if (drawn >= MAX) break;
    }
    if (drawn >= MAX) break;
  }
  return g;
};

const buildSdSlot: FixtureBuilder = (size, facing) => {
  const g = fixtureGroup('sd-slot');
  const [cx, cy, cz] = bboxCenter(size);
  // Tin-plated tray
  g.add(placeAt(box(size, '#c8c8c8', { metalness: 0.55, roughness: 0.5 }), cx, cy, cz));
  // Recessed card-entry slot at the front face. Slot's "long" dimension is
  // perpendicular to the depth axis (cards slide IN along depth axis); the
  // slot is thinner along the depth axis to look like a card slot.
  const depth = depthAxisForFacing(facing, size);
  const slotSize: FixtureSize = {
    x: Math.max(0.3, size.x * (depth.axis === 'x' ? 0.3 : 0.85)),
    y: Math.max(0.3, size.y * (depth.axis === 'y' ? 0.3 : 0.85)),
    z: Math.max(0.2, size.z * 0.3),
  };
  const slot = box(slotSize, '#1a1a1a', { metalness: 0.05, roughness: 0.95 });
  const insetD =
    depth.axis === 'x' ? slotSize.x / 2 : depth.axis === 'y' ? slotSize.y / 2 : slotSize.z / 2;
  const [fx, fy, fz] = frontFaceCenter(facing, size, insetD);
  // SD slot sits at the top of the body (z near top) for typical board mount.
  slot.position.set(fx, fy, depth.axis === 'z' ? fz : size.z * 0.85);
  g.add(slot);
  return g;
};

const buildFpcConnector: FixtureBuilder = (size, _facing) => {
  void _facing; // FPC ribbon connectors look the same on any side
  const g = fixtureGroup('fpc');
  // Brown body
  g.add(
    placeAt(box({ x: size.x, y: size.y, z: size.z * 0.7 }, '#8a5a2a', { metalness: 0.05, roughness: 0.9 }),
      size.x / 2,
      size.y / 2,
      size.z * 0.35,
    ),
  );
  // Black flap
  g.add(
    placeAt(box({ x: size.x, y: size.y, z: size.z * 0.3 }, '#1a1a1a', { metalness: 0.05, roughness: 0.95 }),
      size.x / 2,
      size.y / 2,
      size.z * 0.85,
    ),
  );
  return g;
};

const buildFanMount: FixtureBuilder = (size, _facing) => {
  void _facing; // fan-mount is radially symmetric (square frame + hub center)
  const g = fixtureGroup('fan-mount');
  const [cx, cy, cz] = bboxCenter(size);
  g.add(placeAt(box(size, '#2a2a2a', { metalness: 0.3, roughness: 0.6 }), cx, cy, cz));
  const r = Math.min(size.x, size.y) * 0.18;
  const hub = cylinder(r, size.z, '#1a1a1a');
  hub.rotation.x = Math.PI / 2;
  hub.position.set(cx, cy, cz);
  g.add(hub);
  return g;
};

const buildAntennaConnector: FixtureBuilder = (size, _facing) => {
  void _facing; // U.FL connector is radially symmetric
  const g = fixtureGroup('ufl');
  const [cx, cy, cz] = bboxCenter(size);
  g.add(placeAt(box(size, '#8a5a3a', { metalness: 0.4, roughness: 0.5 }), cx, cy, cz));
  const r = Math.min(size.x, size.y) * 0.32;
  const top = cylinder(r, size.z * 0.4, '#d4af37');
  top.rotation.x = Math.PI / 2;
  top.position.set(cx, cy, size.z * 0.8);
  g.add(top);
  return g;
};

const buildAudioJack35: FixtureBuilder = (size, facing) => {
  const g = fixtureGroup('audio-jack-3-5');
  const depth = depthAxisForFacing(facing, size);
  const r = Math.min(depth.perpSize.wide, depth.perpSize.tall) * 0.45;
  // Body cylinder along the depth axis, length = depth.length.
  const body = cylinder(r, depth.length, '#1c1c1c');
  alignCylinderToDepth(body, depth);
  const [cx, cy, cz] = bboxCenter(size);
  body.position.set(cx, cy, cz);
  g.add(body);
  // Inner hole drilled in from the front face (a darker inner cylinder of
  // half-length so it visibly recedes into the body).
  const holeLen = depth.length * 0.5;
  const hole = cylinder(r * 0.45, holeLen, '#000000');
  alignCylinderToDepth(hole, depth);
  const [fx, fy, fz] = frontFaceCenter(facing, size, holeLen / 2);
  hole.position.set(fx, fy, fz);
  g.add(hole);
  return g;
};

const buildXlr3: FixtureBuilder = (size, facing) => {
  const g = fixtureGroup('xlr-3');
  const depth = depthAxisForFacing(facing, size);
  const r = Math.min(depth.perpSize.wide, depth.perpSize.tall) * 0.45;
  // Issue #99 — body cylinder along the depth axis (was hardcoded to +Y;
  // for any facing other than ±y the body was rendering vertical or sideways).
  const body = cylinder(r, depth.length, '#222222', { segments: 32 });
  alignCylinderToDepth(body, depth);
  const [cx, cy, cz] = bboxCenter(size);
  body.position.set(cx, cy, cz);
  g.add(body);
  // Three-pin pattern at the FRONT face. Pins distribute on a circle in the
  // plane perpendicular to the depth axis. Pin axis is parallel to the body.
  const pinR = 0.6;
  const pinLen = depth.length * 0.4;
  const pinCircleR = r * 0.4;
  for (let i = 0; i < 3; i++) {
    const theta = (Math.PI * 2 * i) / 3 - Math.PI / 2;
    const u = Math.cos(theta) * pinCircleR;
    const v = Math.sin(theta) * pinCircleR;
    // Pin sits on the perpendicular plane at the FRONT face, inset by
    // half its length so the pin extends out of the body face.
    const [fx, fy, fz] = frontFaceCenter(facing, size, pinLen / 2);
    let px = fx;
    let py = fy;
    let pz = fz;
    // u,v offsets in the plane perpendicular to depth.axis.
    if (depth.axis === 'x') {
      // perpendicular plane = (y, z); wide=y, tall=z
      py += u;
      pz += v;
    } else if (depth.axis === 'y') {
      // perpendicular plane = (x, z); wide=x, tall=z
      px += u;
      pz += v;
    } else {
      // depth.axis === 'z'; perpendicular plane = (x, y)
      px += u;
      py += v;
    }
    const pin = cylinder(pinR, pinLen, '#d4af37');
    alignCylinderToDepth(pin, depth);
    pin.position.set(px, py, pz);
    g.add(pin);
  }
  return g;
};

const KIND_BUILDERS: Partial<Record<ComponentKind, FixtureBuilder>> = {
  'usb-c': buildUsbC,
  'usb-a': buildUsbA,
  'usb-b': buildUsbB,
  'micro-usb': buildMicroUsb,
  hdmi: buildHdmi,
  'micro-hdmi': buildMicroHdmi,
  'barrel-jack': buildBarrelJack,
  'ethernet-rj45': buildRj45,
  'gpio-header': buildPinHeader,
  'sd-card': buildSdSlot,
  'flat-cable': buildFpcConnector,
  'fan-mount': buildFanMount,
  'antenna-connector': buildAntennaConnector,
};

const FIXTURE_ID_BUILDERS: Record<string, FixtureBuilder> = {
  'audio-jack-3-5': buildAudioJack35,
  'xlr-3': buildXlr3,
};

/**
 * Resolve a fixture for a given kind / fixtureId. Returns null if neither has
 * a procedural builder; the caller should fall back to a plain coloured block.
 *
 * Issue #99 — `facing` defaults to '+y' (the historical canonical) so existing
 * call sites that don't pass a facing keep their previous behavior on
 * +y-facing components and now ALSO orient correctly for other facings.
 */
export function buildFixture(
  kind: ComponentKind,
  size: FixtureSize,
  fixtureId?: string,
  facing: Facing = '+y',
): THREE.Group | null {
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) return null;
  if (fixtureId && FIXTURE_ID_BUILDERS[fixtureId]) {
    return FIXTURE_ID_BUILDERS[fixtureId]!(size, facing);
  }
  const builder = KIND_BUILDERS[kind];
  if (!builder) return null;
  return builder(size, facing);
}

export function listProceduralKinds(): ComponentKind[] {
  return Object.keys(KIND_BUILDERS) as ComponentKind[];
}

export function listProceduralFixtureIds(): string[] {
  return Object.keys(FIXTURE_ID_BUILDERS);
}
