import BoxDetail from "@/presentation/boxes/detail/BoxDetail";

export default function BoxDetailPage({ params }: { params: { id: string } }) {
  return <BoxDetail boxId={params.id} />;
}
