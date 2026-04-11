import DoctorDetail from "@/presentation/doctors/DoctorDetail";

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <DoctorDetail userId={params.id} />;
}
