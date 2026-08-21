"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import { ClinicsRepositoryHttp } from "@/data/clinics/ClinicsRepository";
import { GetMyProfileUseCase } from "@/domain/profile/usecases/ProfileUseCases";
import { ClearSelectedClinicUseCase } from "@/domain/clinics/usecases/ClearSelectedClinicUseCase";
import { GetMyClinicsUseCase } from "@/domain/clinics/usecases/GetMyClinicsUseCase";
import { normalizePermissions } from "@/lib/permissions";

type Role = "ADMIN" | "SECRETARY" | "DOCTOR";

export function getInitials(firstName: string, lastName: string, email: string) {
  const seed = `${firstName} ${lastName}`.trim() || email || "MG";
  return seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function useSidebarViewModel() {
  const { getMyProfileUseCase, clearSelectedClinicUseCase, getMyClinicsUseCase } = useMemo(() => {
    const profileRepo = new ProfileRepositoryHttp();
    const clinicsRepo = new ClinicsRepositoryHttp();

    return {
      getMyProfileUseCase: new GetMyProfileUseCase(profileRepo),
      clearSelectedClinicUseCase: new ClearSelectedClinicUseCase(clinicsRepo),
      getMyClinicsUseCase: new GetMyClinicsUseCase(clinicsRepo),
    };
  }, []);

  const [role, setRole] = useState<Role | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("Medigest");
  const [clinicLabel, setClinicLabel] = useState("Panel clinico");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [initials, setInitials] = useState("MG");
  const [clinicCount, setClinicCount] = useState(0);

  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        const profile = await getMyProfileUseCase.execute();
        setRole(profile.role as Role);
        setIsSuperAdmin(profile.isSuperAdmin === true);
        setPermissions(normalizePermissions(profile.permissions));
        setEmail(profile.email);
        setImage(profile.image ?? null);
        setDisplayName(`${profile.firstName} ${profile.lastName}`.trim() || profile.email);
        setClinicLabel(profile.clinicLabel ?? "Sede actual");
        setInitials(getInitials(profile.firstName, profile.lastName, profile.email));
      } catch {
        setRole(null);
        setIsSuperAdmin(false);
        setPermissions([]);
      }

      try {
        const clinics = await getMyClinicsUseCase.execute();
        setClinicCount(clinics.length);
      } catch {
        setClinicCount(0);
      }
    };

    const handleProfileUpdated = () => {
      void loadSidebarData();
    };

    void loadSidebarData();
    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("focus", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("focus", handleProfileUpdated);
    };
  }, [getMyProfileUseCase, getMyClinicsUseCase]);

  const handleChangeClinic = async () => {
    await clearSelectedClinicUseCase.execute();
    window.location.assign("/select-clinic");
  };

  return {
    state: {
      role,
      isSuperAdmin,
      permissions,
      displayName,
      clinicLabel,
      email,
      image,
      initials,
      canChangeClinic: clinicCount > 1,
    },
    actions: {
      handleChangeClinic,
    },
  };
}

