"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Box } from "@/domain/boxes/entities/Box";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { BoxesRepositoryHttp } from "@/data/boxes/BoxesRepository";
import { GetCurrentSessionUseCase } from "@/domain/auth/usecases/GetCurrentSessionUseCase";
import { DeleteBoxUseCase, GetBoxesUseCase, SaveBoxUseCase } from "@/domain/boxes/usecases/BoxesUseCases";
import { hasPermission } from "@/lib/permissions";

export function useBoxesViewModel() {
  const { getCurrentSessionUseCase, getBoxesUseCase, saveBoxUseCase, deleteBoxUseCase } = useMemo(() => {
    const authRepo = new AuthRepositoryHttp();
    const boxesRepo = new BoxesRepositoryHttp();

    return {
      getCurrentSessionUseCase: new GetCurrentSessionUseCase(authRepo),
      getBoxesUseCase: new GetBoxesUseCase(boxesRepo),
      saveBoxUseCase: new SaveBoxUseCase(boxesRepo),
      deleteBoxUseCase: new DeleteBoxUseCase(boxesRepo),
    };
  }, []);
  const [items, setItems] = useState<Box[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Box | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Box | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const session = await getCurrentSessionUseCase.execute();
        setRole(session.role ?? null);
        setIsSuperAdmin(session.isSuperAdmin === true);
        setPermissions(session.permissions ?? []);
      } catch {
        setRole(null);
        setIsSuperAdmin(false);
        setPermissions([]);
      } finally {
        setRoleLoading(false);
      }
    };
    void loadRole();
  }, [getCurrentSessionUseCase]);

  const loadBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await getBoxesUseCase.execute();
      setItems(nextItems);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [getBoxesUseCase]);

  const canUseBoxes = hasPermission(role, permissions, "BOXES", isSuperAdmin);

  useEffect(() => {
    if (roleLoading) return;
    if (!canUseBoxes) {
      window.location.assign("/dashboard");
      return;
    }
    void loadBoxes();
  }, [canUseBoxes, roleLoading, loadBoxes]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.toLowerCase();
    return items.filter((b) => b.name.toLowerCase().includes(term));
  }, [items, query]);

  const totalLabel = `${items.length} box${items.length === 1 ? "" : "es"}`;
  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  // Modal actions
  const openCreateModal = () => {
    setSelected(null);
    setName("");
    setNameError(null);
    setApiError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (box: Box) => {
    setSelected(box);
    setName(box.name);
    setNameError(null);
    setApiError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setName("");
    setNameError(null);
    setApiError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Nombre obligatorio.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setApiError(null);

    const editing = Boolean(selected);

    try {
      await saveBoxUseCase.execute({
        id: editing ? selected!.id : undefined,
        name: name.trim(),
      });
      closeModal();
      setSuccessMessage(editing ? "Box actualizado." : "Box creado.");
      await loadBoxes();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo guardar el box.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteBoxUseCase.execute(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage("Box eliminado.");
      await loadBoxes();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el box.");
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  return {
    state: {
      items,
      filteredItems,
      query,
      role,
      canUseBoxes,
      roleLoading,
      loading,
      isModalOpen,
      selected,
      name,
      nameError,
      saving,
      apiError,
      successMessage,
      deleteTarget,
      deleteError,
      totalLabel,
      headerHint,
    },
    actions: {
      setQuery,
      setName,
      setNameError,
      openCreateModal,
      openEditModal,
      closeModal,
      handleSubmit,
      handleDelete,
      setDeleteTarget,
      dismissDeleteModal,
    },
  };
}
