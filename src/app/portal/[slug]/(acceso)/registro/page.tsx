import PortalSignup from "@/presentation/portal/PortalSignup";

export default function PortalRegistro({ params }: { params: { slug: string } }) {
  return <PortalSignup slug={params.slug} />;
}
