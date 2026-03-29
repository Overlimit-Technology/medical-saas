import { redirect } from "next/navigation";

export default function DoctorDetailRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/usuarios/${params.id}`);
}
