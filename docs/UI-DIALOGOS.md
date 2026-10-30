# Dialogos, avisos y selectores de la interfaz

## Regla: prohibido usar alertas nativas del navegador

No se permite `alert()`, `confirm()`, `prompt()` ni `window.alert/confirm/prompt` (ni `globalThis.*`).
ESLint lo bloquea con `no-alert`, `no-restricted-globals` y `no-restricted-properties`
(ver `.eslintrc.json`). `npx eslint src --quiet` debe pasar sin errores.

Motivos: no respetan el tema ni la tipografia, no se pueden traducir ni estilizar, bloquean el hilo
y no funcionan bien en pantalla completa o dentro de otros modales.

## Sistema central

Codigo en `src/presentation/common/dialogs/`. El `DialogProvider` ya esta montado en
`src/app/layout.tsx`, asi que los hooks funcionan en toda la app (incluido login y super-admin).

```tsx
import { useConfirm, useAlert, usePrompt, useToast } from "@/presentation/common/dialogs";

const confirm = useConfirm();
const alert = useAlert();
const prompt = usePrompt();
const toast = useToast();

// Confirmacion: devuelve true/false (Escape, X o Cancelar = false)
if (await confirm({
  title: "Eliminar paciente",
  message: "Esta accion no se puede deshacer.",
  confirmLabel: "Eliminar",
  tone: "danger", // "default" | "danger"
})) { ... }

// Aviso informativo (tone: "info" | "success" | "error")
await alert({ title: "No se pudo guardar", message: "Intenta de nuevo.", tone: "error" });

// Texto: devuelve string o null si se cancela
const reason = await prompt({ title: "Motivo", label: "Motivo de anulacion", validate: (v) => (v.trim() ? null : "Requerido") });

// Toast no bloqueante
toast({ message: "Guardado", tone: "success" }); // tambien toast("texto")
```

Notas de uso:

- Los hooks deben llamarse en el cuerpo del componente (reglas de hooks), no dentro de handlers.
  Nombra las variables `confirmDialog`/`alertDialog` si en el archivo hay otras cosas llamadas `confirm`.
- Para acciones destructivas usa `tone: "danger"`: el foco inicial cae en "Cancelar".
- Usa toast para exito de operaciones; `alert` para errores que el usuario debe leer.
- Los dialogos se apilan (un `confirm` dentro de otro modal queda encima) y se montan en portal en
  `document.body`, o en el elemento en pantalla completa si lo hay.
- Accesibilidad: `role="dialog"`/`"alertdialog"`, `aria-modal`, foco atrapado y devuelto al cerrar, Escape.
- Animaciones con transiciones CSS; con `prefers-reduced-motion` se desactivan.

## Selector (`Select`)

Para listas desplegables usa `src/presentation/common/Select.tsx` en lugar de `<select>` nativo:
listbox accesible en portal, animado, con busqueda opcional, estado vacio y opcion "Otra...".

```tsx
<Select
  value={role}
  onChange={setRole}
  options={[{ value: "ADMIN", label: "Admin" }, { value: "DOCTOR", label: "Profesional" }]}
  placeholder="Selecciona"
  searchable        // busqueda; se activa sola con mas de 8 opciones
  otherOption={{ label: "Otra...", value: "__other__" }}
/>
```

Los `<select>` nativos que sigan en el repo son deuda pendiente de migrar (ver el reporte del cambio).
