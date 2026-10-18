import { Suspense } from "react";
import MisBoletas from "@/presentation/liquidaciones/MisBoletas";

export default function MisBoletasPage() {
  return (
    <Suspense fallback={null}>
      <MisBoletas />
    </Suspense>
  );
}
