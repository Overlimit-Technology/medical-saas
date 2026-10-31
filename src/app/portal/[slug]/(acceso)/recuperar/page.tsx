import PortalRecover from "@/presentation/portal/PortalRecover";

export default function PortalRecuperar({ params }: { params: { slug: string } }) {
  return <PortalRecover slug={params.slug} />;
}
