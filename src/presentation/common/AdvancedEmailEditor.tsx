"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Lazy load GrapesJS para evitar problemas de SSR
const GrapesJSComponent = dynamic(
  () => import("./GrapesJSEditor"),
  { ssr: false, loading: () => <div className="flex h-96 items-center justify-center">Cargando editor...</div> }
);

type AdvancedEmailEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function AdvancedEmailEditor({
  content,
  onChange,
  placeholder,
}: AdvancedEmailEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="animate-spin rounded-full border-4 border-slate-300 border-t-[#19b3bc] h-8 w-8" />
      </div>
    );
  }

  return (
    <GrapesJSComponent
      content={content}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
