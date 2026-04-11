import type { Box } from "../entities/Box";
import type { BoxesRepository } from "../repositories/BoxesRepository";

export class GetBoxesUseCase {
  constructor(private readonly repo: BoxesRepository) {}

  async execute(): Promise<Box[]> {
    return this.repo.getBoxes();
  }
}

export class GetBoxDetailUseCase {
  constructor(private readonly repo: BoxesRepository) {}

  async execute(boxId: string): Promise<Box | null> {
    return this.repo.getBox(boxId);
  }
}

export class SaveBoxUseCase {
  constructor(private readonly repo: BoxesRepository) {}

  async execute(input: { id?: string; name: string }): Promise<Box> {
    const name = input.name?.trim();
    if (!name) {
      throw new Error("Nombre obligatorio.");
    }

    return this.repo.saveBox({ ...input, name });
  }
}

export class DeleteBoxUseCase {
  constructor(private readonly repo: BoxesRepository) {}

  async execute(boxId: string): Promise<void> {
    await this.repo.deleteBox(boxId);
  }
}
