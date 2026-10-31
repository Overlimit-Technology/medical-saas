"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Coins, Receipt, UserCircle } from "lucide-react";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import { GetMyProfileUseCase } from "@/domain/profile/usecases/ProfileUseCases";
import ProfileTab from "@/presentation/settings/tabs/ProfileTab";
import { Loading, PageHead, Segmented, View } from "@/presentation/ui/zs";

const VacationSettings = dynamic(() => import("@/presentation/vacations/VacationSettings"), { ssr: false });
const MyLiquidacionesTab = dynamic(() => import("@/presentation/settings/tabs/MyLiquidacionesTab"), { ssr: false });
const MisBoletas = dynamic(() => import("@/presentation/liquidaciones/MisBoletas"), { ssr: false });

type Tab = "datos" | "vacaciones" | "boleta" | "liquidaciones";

/**
 * Mi perfil: todo lo personal en un solo lugar (datos y foto, vacaciones, boleta de honorarios
 * y liquidaciones). Antes estaba repartido entre Configuracion y el menu lateral.
 */
export default function MyProfile() {
  const router = useRouter();
  const params = useSearchParams();
  const getProfile = useMemo(() => new GetMyProfileUseCase(new ProfileRepositoryHttp()), []);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile
      .execute()
      .then((p) => setRole(p.role))
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, [getProfile]);

  // Las mismas pestañas que antes veia cada rol en Configuracion; Mi boleta solo para profesionales.
  const tabs = useMemo(() => {
    const list: Array<{ id: Tab; label: string; icon: typeof UserCircle }> = [
      { id: "datos", label: "Mis datos", icon: UserCircle },
      { id: "vacaciones", label: "Vacaciones", icon: CalendarDays },
    ];
    if (role === "DOCTOR") list.push({ id: "boleta", label: "Mi boleta", icon: Receipt });
    if (role === "DOCTOR" || role === "SECRETARY") list.push({ id: "liquidaciones", label: "Liquidaciones", icon: Coins });
    return list;
  }, [role]);

  const requested = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some((t) => t.id === requested) ? (requested as Tab) : "datos";
  const setTab = (id: Tab) => router.replace(id === "datos" ? "/profile" : `/profile?tab=${id}`, { scroll: false });

  return (
    <View label="Mi perfil">
      <PageHead tag="Mi perfil" title="Tu cuenta," accent="en un solo lugar" lead="Tus datos, tus vacaciones y lo que tiene que ver con tus pagos." />
      {loading ? (
        <Loading />
      ) : (
        <>
          <Segmented label="Secciones de mi perfil" items={tabs} value={tab} onChange={setTab} />
          {tab === "datos" && <ProfileTab />}
          {tab === "vacaciones" && <VacationSettings />}
          {tab === "boleta" && (
            <Suspense fallback={<Loading />}>
              <MisBoletas />
            </Suspense>
          )}
          {tab === "liquidaciones" && <MyLiquidacionesTab />}
        </>
      )}
    </View>
  );
}
