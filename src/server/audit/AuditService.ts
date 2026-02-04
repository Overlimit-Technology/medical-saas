import { prisma } from "@/lib/prisma";

export class AuditService {
  static async log(event: string, author: string, detail?: string) {
    await prisma.auditLog.create({
      data: {
        event,
        author,
        detail,
      },
    });
  }
}
