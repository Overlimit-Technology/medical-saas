import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { BoxesService } from "@/server/boxes/BoxesService";

const boxSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    const items = await BoxesService.list(session.clinicId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load boxes" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = boxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const item = await BoxesService.create(session.clinicId, parsed.data.name);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to create box" }, { status: 400 });
  }
}
