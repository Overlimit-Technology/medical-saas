import type { InternalAlertsListResult } from "../entities/InternalAlert";
import type { InternalAlertsRepository } from "../repositories/InternalAlertsRepository";

export class ListInternalAlertsUseCase {
  constructor(private readonly repo: InternalAlertsRepository) {}

  async execute(): Promise<InternalAlertsListResult> {
    return this.repo.list();
  }
}

export class MarkInternalAlertAsReadUseCase {
  constructor(private readonly repo: InternalAlertsRepository) {}

  async execute(alertId: string): Promise<void> {
    await this.repo.markAsRead(alertId);
  }
}
