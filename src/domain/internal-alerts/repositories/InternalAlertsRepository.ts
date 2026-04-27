import type { InternalAlertsListResult } from "../entities/InternalAlert";

export interface InternalAlertsRepository {
  list(): Promise<InternalAlertsListResult>;
  markAsRead(alertId: string): Promise<void>;
}
