import PortalLogin from "@/presentation/portal/PortalLogin";

export default function PortalIngresar({ params }: { params: { slug: string } }) {
  return <PortalLogin slug={params.slug} />;
}
