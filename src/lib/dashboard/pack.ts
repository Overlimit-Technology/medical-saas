/**
 * Ubica los widgets en la grilla. Primero los que tienen celda fija (solo con 4 columnas, que es
 * donde se fijaron); despues los demas, en orden, en el primer lugar donde quepan (de izquierda a
 * derecha y de arriba abajo). Asi un widget soltado en un espacio en blanco queda justo ahi.
 */
import { GRID } from "./catalog";

export type PackItem = { id: string; w: number; h: number; x?: number | null; y?: number | null };
export type Placement = { x: number; y: number; w: number; h: number };

/**
 * Columnas segun el ancho del panel, con los mismos cortes que .zs-dash-grid en globals.css.
 * No se leen de la grilla: con ubicaciones explicitas, la grilla podria tener columnas de mas.
 */
export const colsForWidth = (width: number) => (width >= 880 ? 4 : width >= 240 ? 2 : 1);

/** Ancho efectivo: con menos de 4 columnas, 3 o 4 ocupan la fila completa. */
export const effectiveW = (w: number, cols: number) => (cols >= GRID.cols ? w : w >= 3 ? cols : Math.min(w, cols));

export function pack(items: PackItem[], cols: number): Map<string, Placement> {
  const taken = new Set<string>();
  const out = new Map<string, Placement>();
  const free = (x: number, y: number, w: number, h: number) => {
    if (x < 0 || x + w > cols) return false;
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) if (taken.has(`${c},${r}`)) return false;
    return true;
  };
  const take = (id: string, p: Placement) => {
    for (let r = p.y; r < p.y + p.h; r++) for (let c = p.x; c < p.x + p.w; c++) taken.add(`${c},${r}`);
    out.set(id, p);
  };

  const flow: PackItem[] = [];
  for (const item of items) {
    const w = effectiveW(item.w, cols);
    if (cols >= GRID.cols && item.x != null && item.y != null && free(item.x, item.y, w, item.h)) {
      take(item.id, { x: item.x, y: item.y, w, h: item.h });
    } else {
      flow.push(item);
    }
  }
  for (const item of flow) {
    const w = effectiveW(item.w, cols);
    for (let y = 0; ; y++) {
      let placed = false;
      for (let x = 0; x + w <= cols; x++) {
        if (free(x, y, w, item.h)) {
          take(item.id, { x, y, w, h: item.h });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }
  return out;
}

/** Celdas ocupadas por un conjunto de ubicaciones y la cantidad de filas que usan. */
export function occupied(placements: Placement[]) {
  const taken = new Set<string>();
  let rows = 0;
  for (const p of placements) {
    for (let r = p.y; r < p.y + p.h; r++) for (let c = p.x; c < p.x + p.w; c++) taken.add(`${c},${r}`);
    rows = Math.max(rows, p.y + p.h);
  }
  return { taken, rows };
}

/** El espacio en blanco mas grande (rectangulo de celdas libres) que contiene la celda (col, row). */
export function largestHole(taken: Set<string>, rows: number, cols: number, col: number, row: number): Placement | null {
  if (col < 0 || col >= cols || row < 0 || row >= rows || taken.has(`${col},${row}`)) return null;
  const free = (x0: number, y0: number, w: number, h: number) => {
    for (let r = y0; r < y0 + h; r++) for (let c = x0; c < x0 + w; c++) if (r >= rows || taken.has(`${c},${r}`)) return false;
    return true;
  };
  let best: Placement | null = null;
  for (let y0 = Math.max(0, row - GRID.maxRows + 1); y0 <= row; y0++)
    for (let x0 = 0; x0 <= col; x0++)
      for (let w = col - x0 + 1; x0 + w <= cols; w++)
        for (let h = row - y0 + 1; h <= GRID.maxRows; h++) {
          if (!free(x0, y0, w, h)) break;
          const area = w * h;
          const bestArea = best ? best.w * best.h : 0;
          if (area > bestArea || (area === bestArea && best && w > best.w)) best = { x: x0, y: y0, w, h };
        }
  return best;
}
