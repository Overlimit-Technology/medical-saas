import { useCallback, useEffect, useState } from "react";
import { isSessionErrorMessage } from "@/lib/auth/sessionErrors";

export type ClinicDashboardData = {
  clinic: { name: string; city: string };
  canManageUsers: boolean;
  modules: {
    boxes: { total: number; icon: string; label: string };
    treatments: { total: number; icon: string; label: string };
    formTemplates: { total: number; icon: string; label: string };
    users: { total: number; doctors: number; staff: number; icon: string; label: string };
    patients: { total: number; icon: string; label: string };
  };
  topTreatments: Array<{ id: string; name: string; price: number }>;
};

export type ClinicProfile = {
  name: string;
  city: string;
  address: string;
  phone: string;
  logoBase64: string | null;
};

type ProfileForm = {
  name: string;
  city: string;
  address: string;
  phone: string;
  logoBase64: string | null;
};

export function useClinicDashboardViewModel() {
  const [state, setState] = useState<{
    data: ClinicDashboardData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const [clinicProfile, setClinicProfile] = useState<ClinicProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    city: "",
    address: "",
    phone: "",
    logoBase64: null,
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/clinic-dashboard");
      const json = await res.json().catch(() => null) as
        | { data?: ClinicDashboardData; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error ?? "No se pudo cargar el panel de clínica.");
      }

      setState({ data: json?.data ?? null, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";

      setState({
        data: null,
        loading: false,
        error: isSessionErrorMessage(message) ? "Tu sesión ya no está disponible." : message,
      });
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic-profile");
      const data = await res.json() as ClinicProfile & { ok?: boolean; isAdmin?: boolean };
      if (res.ok) {
        setClinicProfile(data);
        setIsAdmin(data.isAdmin ?? false);
      }
    } catch {
      // profile unavailable, silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!profileSuccess) return;
    const t = window.setTimeout(() => setProfileSuccess(null), 2500);
    return () => window.clearTimeout(t);
  }, [profileSuccess]);

  const startProfileEditing = () => {
    if (!clinicProfile) return;
    setProfileForm({
      name: clinicProfile.name,
      city: clinicProfile.city,
      address: clinicProfile.address,
      phone: clinicProfile.phone,
      logoBase64: clinicProfile.logoBase64,
    });
    setProfileError(null);
    setProfileEditing(true);
  };

  const cancelProfileEditing = () => {
    setProfileEditing(false);
    setProfileError(null);
  };

  const handleProfileFieldChange = (key: keyof ProfileForm, value: string | null) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (file: File) => {
    if (file.size > 300 * 1024) {
      setProfileError("El logo no puede superar 300 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setProfileForm((prev) => ({ ...prev, logoBase64: result }));
        setProfileError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/clinic-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo guardar el perfil.");
      }
      setClinicProfile({ ...profileForm });
      setProfileEditing(false);
      setProfileSuccess("Perfil actualizado.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setProfileSaving(false);
    }
  };

  return {
    state,
    clinicProfile,
    isAdmin,
    profileForm,
    profileEditing,
    profileSaving,
    profileError,
    profileSuccess,
    actions: {
      fetchData,
      startProfileEditing,
      cancelProfileEditing,
      handleProfileFieldChange,
      handleLogoUpload,
      saveProfile,
    },
  };
}
