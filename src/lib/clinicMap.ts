/** Mapa de la sede: grilla de celdas donde se dibujan los boxes y las areas (recepcion, sala de espera...). */
export const MAP_COLS = 24;
export const MAP_ROWS = 16;

export type MapShape = {
  id: string;
  kind: "box" | "area";
  boxId?: string | null;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ClinicMap = { shapes: MapShape[] };
