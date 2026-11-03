# Panel personalizable del admin

La **Vista general** (`/clinic-dashboard`, solo ADMIN) es un panel de widgets que cada admin arma a su manera. Reemplaza la vista fija de antes (`AdminOverview` y `GET /api/dashboard/clinic-overview`). Sus cifras siguen en el diseño por defecto.

## Qué puede hacer el usuario

El panel funciona como los widgets de la pantalla de inicio del iPhone. Con **Editar panel** entra al modo editar: los widgets tiemblan levemente y aparece una barra fija con **+** (añadir), **Restablecer** y **Listo**.

| Acción | Cómo |
|---|---|
| Cambiar el tamaño | Arrastrar cualquier borde o esquina. El widget sigue al puntero y debajo se ve en gris la celda donde se va a enganchar. Sirve cualquier tamaño entero de 1 a 4 columnas y de 1 a 4 filas (por ejemplo 3×2 o 1×3), siempre que el gráfico quepa. En el engranaje están los atajos (Pequeño, Mediano, Grande, Ancho completo, Completo alto) y el ajuste "a tu medida" |
| Reordenar | Arrastrar la tarjeta sobre otra. Funciona con mouse y con el dedo. El destino se ve en gris y, al soltar, la tarjeta se desliza hasta él |
| Llenar un espacio en blanco | Arrastrar la tarjeta a un hueco libre. El gris toma la forma del hueco más grande bajo el puntero y, al soltar, el widget adopta ese tamaño y queda fijo en ese lugar; los demás fluyen alrededor. Si el hueco es muy chico para el gráfico, no se fuerza |
| Quitar | Botón **–** en la esquina superior izquierda |
| Añadir | **+** abre la galería desde abajo, agrupada por categoría y con buscador. Al tocar un widget se ve una vista previa en cada tamaño y en cada tipo de gráfico, con datos de ejemplo. Se añade con un toque, o en escritorio arrastrándolo a la grilla, donde aparece el hueco en que va a caer |
| Filtrar por periodo | Semana, mes, trimestre, semestre o año, con flechas para ir al periodo anterior o al siguiente. Cada cifra se compara con el periodo previo del mismo largo |
| Cambiar el gráfico | Engranaje del widget → Tipo de gráfico. Solo aparecen los gráficos que tienen sentido para esa métrica |
| Periodo propio | Un widget puede ignorar el filtro del panel y mostrar siempre, por ejemplo, el año actual |
| Meta con semáforo | En las cifras: verde al cumplirla, ámbar desde el 80 % y rojo más abajo. En las métricas donde subir es malo (inasistencias, cobros pendientes) la meta es un máximo |
| Exportar | CSV de cada widget (se abre bien en Excel) |
| Volver al inicio | **Restablecer** borra el diseño guardado |

El diseño se guarda solo, unos instantes después de cada cambio. Queda guardado por usuario y por sede.

## Tamaños

Cada widget ocupa de 1 a 4 columnas y de 1 a 4 filas, siempre en celdas enteras. Las cifras caben en una sola celda; los gráficos necesitan al menos dos (2×1 o 1×2) para no cortarse (`spanFits` en `src/lib/dashboard/catalog.ts`).

Cómo se reparte una cifra según su tamaño:

| Celdas | Qué muestra |
|---|---|
| 1×1 | Solo el valor; la etiqueta es el título |
| Una fila, 2 o 3 columnas | Valor, variación con color y minigráfica |
| Una fila, 4 columnas | Valor y variación, tendencia ancha y detalle en tres zonas |
| Dos filas o más | Valor y variación, tendencia, periodo anterior y meta |

Los números y los anillos se ajustan al tamaño real de su widget con *container queries*.

## Cómo se ubican

`src/lib/dashboard/pack.ts` calcula la celda de cada widget y la grilla las dibuja con posiciones explícitas:

1. Primero van los widgets con celda fija (`x`, `y`), que son los que se soltaron en un espacio en blanco.
2. Después van los demás, en orden, en el primer lugar donde quepan.

Las celdas fijas solo se usan con 4 columnas. En tablet y celular todo fluye en orden. Reordenar un widget sobre otro le quita la celda fija.

## Responsive

Las columnas dependen del ancho real del panel, no del de la ventana:

- **4 columnas** desde 880 px de ancho útil (escritorio y laptop);
- **2 columnas** en tablet y celular, con filas más bajas en el celular;
- **1 columna** en anchos mínimos.

Los tamaños "Ancho completo" y "Completo alto" siempre ocupan la fila entera. En tablet se usan 2 columnas y no 3, para que los widgets de 2 columnas no dejen huecos.

Bajo 1024 px el menú lateral de la app pasa a ser un cajón que se abre con ☰. El panel de notificaciones de la derecha aparece desde 1536 px; más abajo se usa la página Notificaciones.

## Formato guardado

Versión 3: cada widget guarda `w` y `h` en celdas y, si se fijó, `x` e `y`. Al leer (`readLayout`) se convierten solos los diseños anteriores: los de la versión 1 (12 columnas) y los de la versión 2 (tamaños fijos con nombre).

## Gráficos

Los gráficos son SVG propios en `src/presentation/dashboard/custom/charts.tsx`, sin librerías. Hay 10 tipos:

- Cifra
- Cifra con tendencia
- Anillo (para porcentajes)
- Líneas
- Área
- Columnas
- Barras
- Dona
- Tabla
- Lista

Los colores de categorías siguen un orden fijo, con el turquesa primero. La paleta se validó para daltonismo sobre blanco.

## Métricas

Hay 58 métricas en `src/lib/dashboard/catalog.ts`, cada una con su cálculo en `src/server/dashboard/DashboardMetrics.ts`. Por módulo:

- **Agenda y citas:** citas, atenciones, asistencia, inasistencias, cancelaciones, confirmación, reservas online, estado, origen, por profesional, horas por box, días y horas punta, llegadas a sala, atraso de llegada y agenda de hoy.
- **Pacientes:** nuevos, activos, atendidos, % que vuelven, por género, por edad y cuentas del portal.
- **Finanzas y caja:**
  - ingresos cobrados, cobros pendientes y ticket promedio;
  - ingresos por tratamiento y por profesional, y estado de pago;
  - ingresos, egresos y saldo de caja;
  - honorarios y boletas de honorarios por estado.
- **Tratamientos:** prestaciones, más realizados, por código Fonasa, planes nuevos, planes por estado y planes activos.
- **Atención clínica:** citas clínicas, registros clínicos, mediciones (FHIR), exámenes e imágenes, y exámenes por estado.
- **CRM:**
  - leads nuevos, conversión y leads por canal;
  - pipeline por etapa, temperatura IA y valor del pipeline;
  - seguimientos vencidos, mensajes, y mensajes recibidos y enviados.
- **Equipo:** profesionales activos, horas por profesional, alertas internas por tipo y vacaciones por aprobar.

### Próximamente

El selector también muestra 30 funciones del mapa de Miro que todavía no guardan datos, cada una con el plan donde se desbloquea. Por ejemplo:

- NPS;
- boletas del SII;
- pagos en línea;
- inventario;
- lista de espera;
- SLA de respuesta;
- telemedicina;
- Contralor IA.

La lista está en `UPCOMING`. Cuando una de esas funciones tenga tabla, se pasa a `METRICS` y se le agrega su `case` en `DashboardMetrics.compute`.

## Cómo se calcula

- `GET /api/dashboard/widgets?period=month&offset=0&metrics=a,b,c` devuelve los datos.
  - Cada fuente (citas, pagos, caja, leads…) se consulta una sola vez por pedido y por periodo.
  - Si una métrica falla, las demás igual se muestran.
- Los periodos (`src/lib/dashboard/period.ts`) usan la hora de Chile. La semana parte el lunes.
- Los tramos de los gráficos cambian según el periodo:
  - semana y mes: días;
  - trimestre: semanas;
  - semestre y año: meses.
- `GET`, `PUT` y `DELETE /api/dashboard/layout` leen, guardan y borran el diseño. Se valida con zod. Un diseño guardado con una métrica que ya no existe se limpia en vez de fallar.

## Base de datos

La migración `20261102120000_dashboard_layout` agrega `ClinicMembership.dashboardLayout` (JSONB). Hay que aplicarla antes de desplegar:

```bash
npx prisma migrate deploy
```

## Pruebas

- `npm run test:dashboard:period`: periodos (cruce de año, trimestres con semana corta, límites) y validez del catálogo y del diseño por defecto.
- Se probó en la base local con Edge headless:
  - carga;
  - cambio de periodo;
  - redimensionar desde una esquina (1×1 a 2×2);
  - reordenar arrastrando;
  - quitar con –;
  - añadir desde la galería, en ancho completo;
  - cambiar el gráfico;
  - agregar un widget;
  - que el diseño se mantenga al recargar.

  Todas las APIs respondieron 200, sin errores de JavaScript ni scroll horizontal a 1440, 1280, 1024, 768 y 390 px (4, 4, 2, 2 y 2 columnas).

## Pendiente

- **Panel compartido.** Hoy el diseño es personal. Si se quiere uno común para la clínica, haría falta un diseño por sede que los admins puedan copiar.
