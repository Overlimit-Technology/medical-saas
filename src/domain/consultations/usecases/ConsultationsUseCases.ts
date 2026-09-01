import type {
  ConsultationBootstrap,
  ConsultationClosureInput,
  ConsultationClosureResult,
  ConsultationDraft,
  ConsultationVisit,
} from "../entities/Consultation";
import type { ConsultationsRepository } from "../repositories/ConsultationsRepository";

export class GetConsultationUseCase {
  constructor(private readonly repo: ConsultationsRepository) {}

  async execute(appointmentId: string): Promise<ConsultationBootstrap> {
    return this.repo.getConsultation(appointmentId);
  }
}

export class StartConsultationUseCase {
  constructor(private readonly repo: ConsultationsRepository) {}

  async execute(appointmentId: string): Promise<ConsultationVisit> {
    return this.repo.startConsultation(appointmentId);
  }
}

export class SaveConsultationDraftUseCase {
  constructor(private readonly repo: ConsultationsRepository) {}

  async execute(appointmentId: string, draft: ConsultationDraft): Promise<{ savedAt: string }> {
    return this.repo.saveDraft(appointmentId, draft);
  }
}

export class CloseConsultationUseCase {
  constructor(private readonly repo: ConsultationsRepository) {}

  async execute(
    appointmentId: string,
    input: ConsultationClosureInput
  ): Promise<ConsultationClosureResult> {
    return this.repo.closeConsultation(appointmentId, input);
  }
}
