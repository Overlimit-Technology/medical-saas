import Image from "next/image";

/** Logo de Zensya con su proporcion original (90 x 89) y su turquesa. */
export default function ZensyaLogo({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src="/portal/zensya-logo.svg"
      alt="Zensya"
      width={size}
      height={Math.round((size * 89) / 90)}
      className={`logo ${className}`}
      unoptimized
    />
  );
}
