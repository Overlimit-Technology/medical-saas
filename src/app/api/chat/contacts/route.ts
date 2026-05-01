import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";

export const dynamic = "force-dynamic";
const ONLINE_WINDOW_MINUTES = 10;

type ConversationSnapshot = {
  clinicId: string;
  participantIds: [string, string];
  lastMessageText: string | null;
  lastMessageAt: Date | null;
};

function isUserOnline(lastLoginAt: Date | string | null, onlineThreshold: Date) {
  if (!lastLoginAt) return false;

  const parsed = lastLoginAt instanceof Date ? lastLoginAt : new Date(lastLoginAt);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed >= onlineThreshold;
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR", "SECRETARY"]);

    const clinic = await prisma.clinic.findFirst({
      where: { id: session.clinicId, isActive: true },
      select: { id: true, name: true, city: true },
    });

    const [contacts, conversationRows] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { not: session.userId },
          status: "ACTIVE",
          role: { in: ["ADMIN", "DOCTOR", "SECRETARY"] },
          clinicMemberships: {
            some: {
              clinicId: session.clinicId,
              status: "ACTIVE",
            },
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          image: true,
          lastLoginAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          doctorProfile: {
            select: {
              specialty: true,
            },
          },
        },
        orderBy: [{ email: "asc" }],
      }),
      (async () => {
        const db = await getMongoDb();
        return db
          .collection<ConversationSnapshot>("chat_conversations")
          .find({ clinicId: session.clinicId, participantIds: session.userId })
          .project({
            clinicId: 1,
            participantIds: 1,
            lastMessageText: 1,
            lastMessageAt: 1,
          })
          .toArray();
      })(),
    ]);

    const conversationMap = new Map<
      string,
      { lastMessageText: string | null; lastMessageAt: Date | null }
    >();

    for (const row of conversationRows) {
      if (!Array.isArray(row.participantIds) || row.participantIds.length !== 2) continue;
      if (!row.participantIds.includes(session.userId)) continue;

      const contactId = row.participantIds.find((participantId) => participantId !== session.userId);
      if (!contactId) continue;

      const current = conversationMap.get(contactId);
      const nextDate = row.lastMessageAt ? new Date(row.lastMessageAt) : null;
      const currentDate = current?.lastMessageAt ? new Date(current.lastMessageAt) : null;

      if (
        !current ||
        (nextDate && (!currentDate || nextDate.getTime() > currentDate.getTime()))
      ) {
        conversationMap.set(contactId, {
          lastMessageText: row.lastMessageText ?? null,
          lastMessageAt: row.lastMessageAt ?? null,
        });
      }
    }

    const onlineThreshold = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);

    const items = contacts
      .map((contact) => {
        const snapshot = conversationMap.get(contact.id);
        return {
          id: contact.id,
          email: contact.email,
          role: contact.role,
          image: contact.image,
          firstName: contact.profile?.firstName ?? "",
          lastName: contact.profile?.lastName ?? "",
          specialty: contact.doctorProfile?.specialty ?? null,
          isOnline: isUserOnline(contact.lastLoginAt, onlineThreshold),
          lastMessageAt: snapshot?.lastMessageAt ? snapshot.lastMessageAt.toISOString() : null,
          lastMessageText: snapshot?.lastMessageText ?? null,
        };
      })
      .sort((left, right) => {
        const leftDate = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
        const rightDate = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;

        if (rightDate !== leftDate) return rightDate - leftDate;

        if (left.isOnline !== right.isOnline) return left.isOnline ? -1 : 1;

        const leftName = `${left.firstName} ${left.lastName}`.trim() || left.email;
        const rightName = `${right.firstName} ${right.lastName}`.trim() || right.email;
        return leftName.localeCompare(rightName, "es", { sensitivity: "base" });
      });

    return NextResponse.json({
      ok: true,
      clinic,
      items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los contactos.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
