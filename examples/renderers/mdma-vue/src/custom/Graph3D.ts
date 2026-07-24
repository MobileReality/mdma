import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import * as THREE from 'three';
import type { CustomComponent, StoreAction } from '@mobile-reality/mdma-spec';
import type { ComponentState } from '@mobile-reality/mdma-runtime';

interface Graph3DProps {
  data?: string;
  x?: string;
  z?: string;
  y?: string;
  title?: string;
  autoRotate?: boolean;
}

function parseCsv(raw: string) {
  const lines = raw
    // Some models emit the CSV with escaped "\n" or with ";" row separators
    // rather than real newlines; normalise both so a single-line block still parses.
    .replace(/\\n/g, '\n')
    .replace(/;/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headers = lines[0].split(',').map((hd) => hd.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((hd, i) => {
      row[hd] = cells[i] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

/** Blue → magenta ramp by normalised height. */
function colorFor(t: number): THREE.Color {
  return new THREE.Color().setHSL(0.62 - 0.42 * t, 0.75, 0.45 + 0.12 * t);
}

/**
 * `graph-3d` — a host-registered MDMA **custom component**. The spec stays
 * intent-level (a CSV `data` payload plus which column maps to which axis);
 * all rendering — a WebGL scene via three.js — lives here in the host. Clicking
 * a bar dispatches into the store, so the selection shows up in the action log
 * like any other MDMA interaction, and fires `actions.onSelect` when declared.
 */
export const Graph3D = defineComponent({
  name: 'Graph3DRenderer',
  props: {
    component: { type: Object as PropType<CustomComponent>, required: true },
    props: { type: Object as PropType<Graph3DProps>, required: true },
    componentState: { type: Object as PropType<ComponentState>, default: undefined },
    dispatch: { type: Function as PropType<(a: StoreAction) => void>, required: true },
    resolveBinding: { type: Function as PropType<(e: string) => unknown>, required: true },
  },
  setup(props) {
    const mount = ref<HTMLDivElement | null>(null);
    const selected = ref<{ x: string; z: string; y: number } | null>(null);
    const sceneReady = ref(false);
    let cleanup: (() => void) | null = null;

    const shape = () => {
      const { data, x, z, y } = props.props;
      if (!data || !x || !z || !y) return null;
      const { rows } = parseCsv(data);
      if (!rows.length) return null;
      const xs = [...new Set(rows.map((r) => r[x]))].filter(Boolean);
      const zs = [...new Set(rows.map((r) => r[z]))].filter(Boolean);
      const max = Math.max(1, ...rows.map((r) => Number(r[y]) || 0));
      return { rows, xs, zs, x, z, y, max, autoRotate: props.props.autoRotate ?? true };
    };

    // Build (or rebuild) the whole scene from the current props. Called on mount
    // AND whenever the props change — crucial during streaming, where the block
    // validates and mounts while `data` is still arriving (often header-only, so
    // zero rows). Without the rebuild the graph would stay stuck on that first,
    // empty parse and never draw the bars that stream in afterwards.
    const build = () => {
      cleanup?.();
      cleanup = null;
      sceneReady.value = false;
      const el = mount.value;
      const parsed = shape();
      if (!el || !parsed) return;
      const { rows, xs, zs, x, z, y, max, autoRotate } = parsed;

      const width = el.clientWidth || el.parentElement?.clientWidth || 600;
      const height = 360;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      el.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(6, 10, 6);
      scene.add(key);

      const group = new THREE.Group();
      const bars: THREE.Mesh[] = [];
      const spacing = 1.5;
      const originX = ((xs.length - 1) * spacing) / 2;
      const originZ = ((zs.length - 1) * spacing) / 2;

      for (const row of rows) {
        const xi = xs.indexOf(row[x]);
        const zi = zs.indexOf(row[z]);
        if (xi < 0 || zi < 0) continue;
        const value = Number(row[y]) || 0;
        const t = value / max;
        const barHeight = Math.max(t * 4, 0.05);
        const mat = new THREE.MeshStandardMaterial({
          color: colorFor(t),
          roughness: 0.45,
          metalness: 0.15,
        });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, barHeight, 0.9), mat);
        bar.position.set(xi * spacing - originX, barHeight / 2, zi * spacing - originZ);
        bar.userData = { xLabel: row[x], zLabel: row[z], value, baseColor: mat.color.clone() };
        bars.push(bar);
        group.add(bar);
      }

      const size = Math.max(xs.length, zs.length);
      const grid = new THREE.GridHelper(size * spacing + 2, size + 2, 0x8899bb, 0x33405c);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.35;
      group.add(grid);
      scene.add(group);

      camera.position.set(7, 6.5, 8.5);
      camera.lookAt(0, 1.2, 0);

      // Drag to orbit; idle auto-rotate otherwise. A near-stationary pointerup
      // counts as a click and selects a bar rather than ending a drag.
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
          selected.value = null;
          return;
        }

        const mesh = hit.object as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x3a6cff);
        mat.color.offsetHSL(0, 0, 0.12);
        highlighted = mesh;

        const datum = {
          x: mesh.userData.xLabel as string,
          z: mesh.userData.zLabel as string,
          y: mesh.userData.value as number,
        };
        selected.value = datum;

        // Selecting a bar is a state change, so it always reports one — the same
        // way a form field does. Without this, clicking a graph whose author
        // wired no `onSelect` would be invisible to the runtime and the log.
        props.dispatch({
          type: 'FIELD_CHANGED',
          componentId: props.component.id,
          field: 'selected',
          value: datum,
        });

        // Fire the semantic action too, when the document declared one.
        const actionId = props.component.actions?.onSelect;
        if (actionId) {
          props.dispatch({
            type: 'ACTION_TRIGGERED',
            componentId: props.component.id,
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
        const w = el.clientWidth || width;
        camera.aspect = w / height;
        camera.updateProjectionMatrix();
        renderer.setSize(w, height);
      };
      window.addEventListener('resize', onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        scene.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(m)) for (const mm of m) mm.dispose();
          else m?.dispose();
        });
        renderer.dispose();
        if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      };

      sceneReady.value = true;
    };

    // Defer one frame so the mount element has a laid-out width before we size
    // the canvas (an async component can mount before layout settles).
    const scheduleBuild = () => requestAnimationFrame(() => build());

    onMounted(scheduleBuild);
    // Rebuild when the data (or axis mapping) changes — e.g. as the block streams
    // in. A signature keeps us from rebuilding the WebGL scene on unrelated ticks.
    watch(
      () => `${props.props.data}|${props.props.x}|${props.props.z}|${props.props.y}`,
      scheduleBuild,
    );

    onBeforeUnmount(() => cleanup?.());

    return () => {
      const p = props.props;
      const invalid = !p.data || !p.x || !p.z || !p.y;
      if (invalid) {
        return h(
          'div',
          { class: 'mdma-unknown-component', 'data-component-id': props.component.id },
          'graph-3d: invalid props — expected `data` (CSV) plus `x`, `z`, and `y` column names.',
        );
      }

      const onSelect = props.component.actions?.onSelect;
      return h('div', { class: 'graph3d', 'data-component-id': props.component.id, style: shell }, [
        p.title || props.component.label
          ? h('div', { style: title3d }, p.title ?? props.component.label)
          : null,
        h('div', { style: { position: 'relative', width: '100%', minHeight: '360px' } }, [
          h('div', { ref: mount, style: { width: '100%', minHeight: '360px' } }),
          !sceneReady.value
            ? h(
                'div',
                { style: placeholder },
                shape() ? 'Rendering 3D graph…' : 'Waiting for graph data…',
              )
            : null,
        ]),
        selected.value
          ? h('div', { style: selRow }, [
              h('b', selected.value.x),
              ' · ',
              h('b', selected.value.z),
              h(
                'span',
                { style: { marginLeft: 'auto', fontWeight: 700 } },
                String(selected.value.y),
              ),
              onSelect ? h('code', { style: actionTag }, `→ ${onSelect}`) : null,
            ])
          : null,
        h('div', { style: legend3d }, [
          h('span', [h('b', 'x '), p.x]),
          h('span', [h('b', 'z '), p.z]),
          h('span', [h('b', 'height '), p.y]),
          h('span', { style: { marginLeft: 'auto', opacity: 0.6 } }, 'drag to orbit · click a bar'),
        ]),
      ]);
    };
  },
});

const shell = {
  margin: '0.5rem 0',
  padding: '0.75rem',
  borderRadius: '14px',
  border: '1px solid rgba(130, 150, 190, 0.28)',
  background: 'linear-gradient(160deg, #141a2c, #0c1018)',
  color: '#e5e7eb',
} as const;
const title3d = { fontWeight: 700, marginBottom: '0.4rem' } as const;
const placeholder = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.85rem',
  opacity: 0.6,
  pointerEvents: 'none',
} as const;
const selRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  marginTop: '0.5rem',
  fontSize: '0.85rem',
} as const;
const actionTag = {
  marginLeft: '0.5rem',
  fontSize: '0.75rem',
  opacity: 0.8,
  fontFamily: 'ui-monospace, monospace',
} as const;
const legend3d = {
  display: 'flex',
  gap: '0.9rem',
  marginTop: '0.5rem',
  fontSize: '0.75rem',
  opacity: 0.85,
} as const;
