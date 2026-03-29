import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/server/auth/requireSession";

export async function POST() {
  try {
    const session = await requireAuthSession();

    await prisma.user.update({
      where: { id: session.userId },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
