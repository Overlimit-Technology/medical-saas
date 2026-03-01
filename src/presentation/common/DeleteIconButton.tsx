"use client";

type DeleteIconButtonProps = {
  ariaLabel: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function DeleteIconButton({
  ariaLabel,
  title,
  disabled = false,
  onClick,
  className = "",
}: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M3 6h18" />
        <path d="M8 6V5c0-.9.7-1.6 1.6-1.6h4.8c.9 0 1.6.7 1.6 1.6v1" />
        <path d="M19 6l-1 13a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  );
}
