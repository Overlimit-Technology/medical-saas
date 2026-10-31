import { NextResponse } from "next/server";
import { clearPortalSession } from "@/server/portal/portalSession";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  clearPortalSession();
  return NextResponse.redirect(new URL(`/portal/${params.slug}/ingresar`, req.url), { status: 303 });
}
