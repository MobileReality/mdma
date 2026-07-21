import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { z } from 'zod';
import type { CustomVariantProps } from '@mobile-reality/mdma-renderer-react';
import type { CustomComponentPromptEntry } from '@mobile-reality/mdma-prompt-pack';

/**
 * Catalog entry advertised to the model via
 * `buildSystemPrompt({ customComponents })`. Without this the agent cannot
 * author a `graph-3d` block at all — the author prompt forbids inventing a
 * `name` that is not in the "Available Custom Components" list.
 *
 * Keep the `props` description in sync with `Graph3DPropsSchema` below: the
 * schema is what validates, this string is what the model reads.
 */
export const GRAPH_3D_CATALOG_ENTRY: CustomComponentPromptEntry = {
  name: 'graph-3d',
  description:
    'Render an interactive 3D bar chart (WebGL) from tabular data — two categorical axes plus a numeric height. Use for comparing a metric across two dimensions at once, e.g. revenue by region and quarter. Bars are clickable: ALWAYS wire `actions.onSelect` to an action label so a click on a bar is actionable.',
  props:
    'data: string (CSV block — header row then rows), x: string (column for the X axis, categorical), z: string (column for the Z axis, categorical), y: string (column for bar height, numeric), title: string (optional), autoRotate: boolean (optional)',
  actions: ['onSelect'],
};

/**
 * `graph-3d` — a host-registered MDMA **custom component**.
 *
 * Demonstrates what the `type: custom` envelope makes possible: the spec stays
 * intent-level (a CSV-ish `data` payload plus which column maps to which axis),
 * while all rendering — here a WebGL scene via three.js — lives entirely in the
 * host renderer. The core spec/parser never learns anything about three.js.
 *
 *   ```mdma
 *   type: custom
 *   id: revenue-3d
 *   name: graph-3d
 *   props:
 *     data: |
 *       region, quarter, revenue
 *       North, Q1, 120
 *     x: region
 *     z: quarter
 *     y: revenue
 *   ```
 */
export const Graph3DPropsSchema = z.object({
  /** CSV-style block: header row + rows. Same shape as the built-in chart. */
  data: z.string().min(1),
  /** Column used for the X axis (categorical). */
  x: z.string().min(1),
  /** Column used for the Z axis (categorical). */
  z: z.string().min(1),
  /** Column used for bar height (numeric). */
  y: z.string().min(1),
  /** Optional chart title shown above the canvas. */
  title: z.string().optional(),
  /** Auto-rotate the scene. Default true. */
  autoRotate: z.boolean().optional(),
});

type Row = Record<string, string>;

function parseCsv(raw: string): { headers: string[]; rows: Row[] } {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row: Row = {};
    for (const [i, h] of headers.entries()) row[h] = cells[i] ?? '';
    return row;
  });
  return { headers, rows };
}

/** Blue → magenta ramp by normalised height. */
function colorFor(t: number): THREE.Color {
  return new THREE.Color().setHSL(0.62 - 0.42 * t, 0.75, 0.45 + 0.12 * t);
}

export const Graph3DRenderer = memo(function Graph3DRenderer({
  component,
  props,
  dispatch,
}: CustomVariantProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<{ x: string; z: string; y: number } | null>(null);
  // Kept in a ref so the three.js click handler always sees the current action
  // id / dispatch without re-creating the whole scene on every render.
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const actionIdRef = useRef<string | undefined>(undefined);
  actionIdRef.current =
    component.type === 'custom' ? component.actions?.onSelect : undefined;

  const parsed = useMemo(() => {
    const result = Graph3DPropsSchema.safeParse(props);
    if (!result.success) return null;
    const { data, x, z, y, title, autoRotate } = result.data;
    const { rows } = parseCsv(data);
    const xs = [...new Set(rows.map((r) => r[x]))].filter(Boolean);
    const zs = [...new Set(rows.map((r) => r[z]))].filter(Boolean);
    const values = rows.map((r) => Number(r[y]) || 0);
    const max = Math.max(...values, 1);
    return { rows, xs, zs, x, z, y, max, title, autoRotate: autoRotate ?? true };
  }, [props]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !parsed) return;
    const { rows, xs, zs, x, z, y, max, autoRotate } = parsed;

    const width = mount.clientWidth || 600;
    const height = 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 10, 6);
    scene.add(key);

    const group = new THREE.Group();
    const bars: THREE.Mesh[] = [];
    const spacing = 1.5;
    const originX = ((xs.length - 1) * spacing) / 2;
    const originZ = ((zs.length - 1) * spacing) / 2;

    // Bars — one per (x, z) pair, height scaled from the `y` column.
    for (const row of rows) {
      const xi = xs.indexOf(row[x]);
      const zi = zs.indexOf(row[z]);
      if (xi < 0 || zi < 0) continue;
      const value = Number(row[y]) || 0;
      const t = value / max;
      const barHeight = Math.max(t * 4, 0.05);
      const geo = new THREE.BoxGeometry(0.9, barHeight, 0.9);
      const mat = new THREE.MeshStandardMaterial({
        color: colorFor(t),
        roughness: 0.45,
        metalness: 0.15,
      });
      const bar = new THREE.Mesh(geo, mat);
      bar.position.set(xi * spacing - originX, barHeight / 2, zi * spacing - originZ);
      // Carried on the mesh so the raycast hit can report which datum it is.
      bar.userData = { xLabel: row[x], zLabel: row[z], value, baseColor: mat.color.clone() };
      bars.push(bar);
      group.add(bar);
    }

    const grid = new THREE.GridHelper(
      Math.max(xs.length, zs.length) * spacing + 2,
      Math.max(xs.length, zs.length) + 2,
      0x8899bb,
      0x33405c,
    );
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    group.add(grid);
    scene.add(group);

    camera.position.set(7, 6.5, 8.5);
    camera.lookAt(0, 1.2, 0);

    // Drag to orbit; otherwise idle auto-rotate. A pointerup that barely moved
    // counts as a click and selects a bar instead of ending a drag.
    let dragging = false;
    let lastX = 0;
    let theta = 0;
    let downX = 0;
    let downY = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let highlighted: THREE.Mesh | null = null;

    const clearHighlight = () => {
      if (!highlighted) return;
      const m = highlighted.material as THREE.MeshStandardMaterial;
      m.color.copy(highlighted.userData.baseColor as THREE.Color);
      m.emissive.setHex(0x000000);
      highlighted = null;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      theta += (e.clientX - lastX) * 0.01;
      lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      const wasDrag = dragging && moved > 4;
      dragging = false;
      if (wasDrag) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(bars, false)[0];

      clearHighlight();
      if (!hit) {
        setSelected(null);
        return;
      }

      const mesh = hit.object as THREE.Mesh;
      const mat2 = mesh.material as THREE.MeshStandardMaterial;
      mat2.emissive.setHex(0x3a6cff);
      mat2.color.offsetHSL(0, 0, 0.12);
      highlighted = mesh;

      const datum = {
        x: mesh.userData.xLabel as string,
        z: mesh.userData.zLabel as string,
        y: mesh.userData.value as number,
      };
      setSelected(datum);

      // Selecting a bar is a state change, so it always reports one — the same
      // way a form field does. Without this, clicking a graph the author did
      // not wire an `onSelect` for would be invisible to the runtime (and to
      // the action log), which reads as "clicking does nothing".
      dispatchRef.current({
        type: 'FIELD_CHANGED',
        componentId: component.id,
        field: 'selected',
        value: datum,
      });

      // Additionally fire the semantic action when the document declared one:
      //   actions:
      //     onSelect: bar-selected
      // The payload carries which datum was clicked so the host/agent can act.
      const actionId = actionIdRef.current;
      if (actionId) {
        dispatchRef.current({
          type: 'ACTION_TRIGGERED',
          componentId: component.id,
          actionId,
          payload: datum,
        });
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let raf = 0;
    const tick = () => {
      if (!dragging && autoRotate) theta += 0.0035;
      group.rotation.y = theta;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = mount.clientWidth || width;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) for (const mm of m) mm.dispose();
        else m?.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [parsed, component.id]);

  if (!parsed) {
    return (
      <div className="mdma-unknown-component" data-component-id={component.id}>
        graph-3d: invalid props — expected `data` (CSV) plus `x`, `z`, and `y` column names.
      </div>
    );
  }

  return (
    <div className="graph3d" data-component-id={component.id}>
      {(parsed.title || component.label) && (
        <div className="graph3d-title">{parsed.title ?? component.label}</div>
      )}
      <div ref={mountRef} className="graph3d-canvas" />
      {selected && (
        <div className="graph3d-selection">
          <span className="graph3d-selection-dot" />
          <span>
            <b>{selected.x}</b> · <b>{selected.z}</b>
          </span>
          <span className="graph3d-selection-value">{selected.y.toLocaleString()}</span>
          {component.type === 'custom' && component.actions?.onSelect && (
            <code className="graph3d-selection-action">→ {component.actions.onSelect}</code>
          )}
        </div>
      )}
      <div className="graph3d-legend">
        <span>
          <b>x</b> {parsed.x}
        </span>
        <span>
          <b>z</b> {parsed.z}
        </span>
        <span>
          <b>height</b> {parsed.y}
        </span>
        <span className="graph3d-hint">drag to orbit · click a bar</span>
      </div>
    </div>
  );
});
