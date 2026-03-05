import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { BoxesService } from "@/server/boxes/BoxesService";
import { prisma } from "@/lib/prisma";

const boxSchema = z.object({
  name: z.string().min(1),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const item = await prisma.box.findFirst({
      where: { id: params.id, clinicId: session.clinicId },
    });
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load box" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = boxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const item = await BoxesService.update(params.id, session.clinicId, parsed.data.name);
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update box" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const result = await BoxesService.remove(params.id, session.clinicId);
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete box" }, { status: 400 });
  }
}
