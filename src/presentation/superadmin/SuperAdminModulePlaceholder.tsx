"use client";

type Props = {
  title: string;
  description: string;
};

export default function SuperAdminModulePlaceholder({ title, description }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

