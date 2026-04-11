import type { Box } from "../entities/Box";

export interface BoxesRepository {
  getBoxes(): Promise<Box[]>;
  getBox(boxId: string): Promise<Box | null>;
  saveBox(input: { id?: string; name: string }): Promise<Box>;
  deleteBox(boxId: string): Promise<void>;
}
