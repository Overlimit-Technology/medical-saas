import { redirect } from "next/navigation";

// Mi boleta es un apartado personal: ahora vive en Mi perfil. Se conserva ?month= de los correos.
export default function MisBoletasPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = searchParams.month ? `&month=${encodeURIComponent(searchParams.month)}` : "";
  redirect(`/profile?tab=boleta${month}`);
}
