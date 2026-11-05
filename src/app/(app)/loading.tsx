import { Loading } from "@/presentation/ui/zs";

/** Mientras llega una pantalla nueva: el esqueleto de una pagina (titulo, cifras y filas), no un circulo. */
export default function AppLoading() {
  return <Loading label="Cargando…" shape="page" />;
}
