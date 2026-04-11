"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Box } from "@/domain/boxes/entities/Box";
import { BoxesRepositoryHttp } from "@/data/boxes/BoxesRepository";
import { GetBoxDetailUseCase } from "@/domain/boxes/usecases/BoxesUseCases";

export function useBoxDetailViewModel(boxId: string) {
  const router = useRouter();
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const getBoxDetailUseCase = useMemo(() => {
    const repo = new BoxesRepositoryHttp();
    return new GetBoxDetailUseCase(repo);
  }, []);

  const loadBox = useCallback(async () => {
    setLoading(true);
    try {
      const item = await getBoxDetailUseCase.execute(boxId);
      setBox(item);
    } catch {
      setBox(null);
    } finally {
      setLoading(false);
    }
  }, [boxId, getBoxDetailUseCase]);

  useEffect(() => {
    void loadBox();
  }, [loadBox]);

  return {
    state: {
      box,
      loading,
    },
    actions: {
      goBack: () => router.push("/boxes"),
      reload: loadBox,
    },
  };
}
