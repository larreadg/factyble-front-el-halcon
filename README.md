# Factyble Cloud · El Halcón

Front de **sólo lectura** para consultar las facturas electrónicas (SIFEN, Paraguay) de
**El Halcón Ferretería**. Los datos viven en Supabase, que es un espejo de las facturas
aprobadas por SIFEN: esta aplicación nunca escribe.

## Stack

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack Query ·
Recharts · Supabase JS v2

## Setup

```bash
npm install
cp .env.example .env.local   # y completar los dos valores
npm run dev
```

`.env.local`:

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Se usa **sólo la anon key**. La `service_role` no va nunca en el front: el acceso está
protegido por RLS y todo es lectura para usuarios autenticados.

## El esquema de la base vive en el backend

Todo el destino —tablas, vistas, las RPC del dashboard, permisos y RLS— está en un único archivo
del repo del backend:

    factyble-back/supabase/schema.sql

**Nada se crea a mano en el SQL Editor de Supabase, y este repo no versiona SQL.** Antes sí: había
dos `.sql` acá y cuatro de las cinco RPC del dashboard no estaban en ningún repo, creadas a mano en
el editor. Un reset de la base las borraba sin que nadie tuviera cómo recrearlas. Si el front
necesita una vista o una RPC nueva, se agrega en ese archivo.

### Lo que el front consume

| Objeto                                                                                                                          | Qué da                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `v_factura`                                                                                                                     | Cabecera con el emisor resuelto — listado y panel de detalle                                  |
| `v_factura_busqueda`                                                                                                            | `v_factura` + `items_texto` + `marcas_texto`, para buscar por lo que se vendió y por su marca |
| `v_factura_item`                                                                                                                | Los ítems, con marca y código de producto                                                     |
| `sync_corrida`                                                                                                                  | Bitácora del sync, para el indicador de "última sincronización"                               |
| `dashboard_resumen` · `dashboard_por_periodo` · `dashboard_top_receptores` · `dashboard_top_productos` · `dashboard_top_marcas` | Las RPC del dashboard                                                                         |
| `dashboard_por_establecimiento`                                                                                                 | Existe en el schema; el front **todavía no la consume**                                       |

Dos detalles del detalle de factura que importan al mostrarlo:

- **`marca` vs `marca_nombre`.** `marca` es el texto congelado al momento de vender — lo que decía
  el KuDE que se le entregó al cliente — y es lo que se **muestra**. `marca_nombre` es el nombre
  vigente del catálogo, y es por el que se **agrupa** en un reporte: sobrevive a que la marca se
  renombre. Los dos pueden ser `null` (~20% de los ítems no tienen marca declarada en el origen).
- **`dashboard_top_productos` agrupa por `producto_id`** cuando lo hay, así que el mismo artículo
  facturado con descripciones distintas cuenta una sola vez. Las facturas que no vienen del PDV no
  traen código y agrupan por descripción, con `producto_id` en `null`.

## Usuarios

No hay registro público ni OAuth: el ingreso es con correo y contraseña.
**Los usuarios se crean desde el panel de Supabase** (_Authentication → Users → Add user_),
y desde ahí también se resetean las contraseñas.

## Scripts

| Comando             | Qué hace                                   |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo                     |
| `npm run build`     | Typecheck (`tsc -b`) + build de producción |
| `npm run preview`   | Sirve el build de producción               |
| `npm run lint`      | ESLint                                     |
| `npm run typecheck` | Sólo el typecheck                          |
| `npm run format`    | Prettier sobre todo el repo                |

## Pantallas

- **Inicio** (`/`) — cuatro métricas (total facturado, facturas emitidas, IVA total y clientes
  distintos); facturación en el tiempo contra el promedio del período; y cuatro bloques en
  **dos filas de dos**: qué se vendió (productos · marcas) arriba, a quién y qué entró último
  (clientes · últimas facturas) abajo. El rango de fechas vive en la URL (`?desde=&hasta=`) y
  la granularidad del gráfico se elige sola: ≤ 31 días por día, ≤ 120 por semana, más por mes.

  Cada métrica lleva una **segunda lectura** al pie, sacada de campos que `dashboard_resumen`
  ya devuelve en la misma llamada: el reparto contado / crédito bajo el total, las canceladas
  que quedaron fuera bajo la cantidad, y las ventas exentas bajo el IVA. El tinte del ícono
  agrupa por pregunta igual que los rankings: `accent` para la plata, `brand` para el volumen.

  **Las cuatro columnas entran recién en `xl`, no en `lg`.** Descontando el sidebar (`w-60`) y
  el padding del `<main>`, en `lg` cada card queda con ~172px útiles y un monto en guaraníes
  necesita 215px a `text-2xl`: se partía en dos y tres líneas justo en las resoluciones de
  laptop más comunes. Por eso el valor además baja un escalón en `xl` y vuelve a subir en `2xl`,
  siguiendo el ancho de la card y no el del viewport.

  Los dos rankings de arriba ordenan por **criterios distintos a propósito**: productos por
  unidades (un artículo se juzga por rotación) y marcas por monto (una marca, por la plata que
  mueve). Cada bloque lo dice en su encabezado, para que la diferencia no se lea como un error.
  El de marcas además aclara que no incluye ítems sin marca: `dashboard_top_marcas` deja fuera
  los que no traen código y el centinela `99999` ("Sin Marca", ~20% de los ítems), así que lo
  que suma no da el total facturado del período.

- **Facturas** (`/facturas`) — tabla con paginación, orden y filtros **server-side**.
  Todo el estado de la vista (página, tamaño, orden, fechas, estado, condición y búsqueda)
  vive en los search params, así que la vista se puede compartir o recargar sin perderse.

  El buscador tiene un **ámbito** adentro del campo (param `en`), y los cuatro no son
  intercambiables:

  | Ámbito      | Busca en                                                  |
  | ----------- | --------------------------------------------------------- |
  | `todo`      | Cabecera + `items_texto` + `marcas_texto` (por defecto)   |
  | `documento` | N° de documento, RUC, receptor, CDC                       |
  | `item`      | `items_texto` — descripción + marca congelada de la línea |
  | `marca`     | `marcas_texto` — la marca sola, con el nombre vigente     |

  **`item` y `marca` no son el mismo filtro.** `items_texto` concatena descripción y marca, así
  que buscar "TRAMONTINA" en `item` también trae el artículo cuya _descripción_ la nombra, y sólo
  encuentra el texto **congelado** al vender. `marcas_texto` es `coalesce(marca_nombre, marca)`
  sin repetir: encuentra la marca por su nombre **vigente**, así que una marca renombrada después
  de venderse sigue apareciendo. El panel de detalle, en cambio, resalta el texto congelado —
  es el documento que se le entregó al cliente y tiene que decir lo que decía el KuDE —, de modo
  que una factura encontrada por el nombre nuevo puede no resaltar ninguna línea. Es correcto,
  no un bug.

## Diseño

- **Mobile first**: las clases base son las de pantalla chica y los breakpoints escalan hacia
  arriba. En mobile el sidebar es un drawer, los presets de fecha son un `select` nativo, las
  métricas van dos por fila y las tablas se muestran como listas; la tabla aparece recién en
  `lg`, que es donde hay ancho para no truncar el receptor.
- **Las últimas facturas del dashboard van como lista en todos los anchos**, no como tabla.
  Ese bloque vive en media columna del grid, y su tabla de seis columnas (fecha, documento,
  receptor, total, estado, enlace) necesita ~640px: media fila da 488px en `xl` y 616px en `2xl`,
  así que sólo entraría en pantallas de 1920. La lista dice lo mismo en dos renglones y entra
  en cualquier ancho.
- **El color de los rankings agrupa por pregunta, no por bloque**: `brand` para los dos que
  contestan "qué se vendió" (productos y marcas, pareados en la misma fila) y `accent` para el
  que contesta "a quién" (clientes).
- **El documento nunca scrollea**: el shell de `AppLayout` es `fixed inset-0`, así queda fuera
  del flujo y no puede aportarle alto a la página. El único scroll es el del `<main>` (y el del
  sidebar si hiciera falta). Con el shell en el flujo normal, el contenido del `<main>` seguía
  contando para el documento: se podía scrollear con la rueda sobre el sidebar y aparecía una
  franja vacía al pie.
- **Color restringido**: el acento se reserva para acciones, selección y estado. Las variaciones
  usan verde/rojo porque ahí el color _es_ el dato, no decoración.
- El gráfico **no usa `ResponsiveContainer`** de Recharts: ese componente sumaba alto al
  documento. Las dimensiones salen de `useTamanioContenedor` (ResizeObserver).

## Convenciones

- **Fechas**: todo se razona en días calendario de `America/Asuncion`, sin depender de la
  zona horaria del navegador. Los helpers están en `src/lib/dates.ts`.
- **Moneda**: guaraníes sin decimales (`Intl.NumberFormat('es-PY')`), centralizado en
  `src/lib/format.ts`. Los `numeric` de PostgreSQL pueden llegar como `string`, por eso todo
  importe pasa por `toNumber()`.
- **Datos**: nada de queries sueltas en los componentes — cada feature tiene su `api.ts` con
  hooks de TanStack Query.
- **Tipos**: `src/types/database.ts` está escrito a mano con la misma forma que genera
  `supabase gen types typescript --schema public`. Cuando haya acceso al CLI se reemplaza el
  archivo por el generado y el resto del código no cambia.

## Estructura

```
src/
  lib/         supabase.ts, format.ts, dates.ts, queryClient.ts, cn.ts
  types/       database.ts
  auth/        AuthProvider, AuthContext, ProtectedRoute, errors
  hooks/       useRangoParams, useDebouncedValue, useTamanioContenedor
  layouts/     AppLayout, Sidebar, Header
  features/
    dashboard/ api.ts + components/ + DashboardPage
    facturas/  api.ts + useFacturasParams + components/ + FacturasPage
    sync/      useUltimaSync, SyncIndicator
  components/ui/
  pages/       LoginPage, NotFoundPage
```

## Identidad

La paleta sale muestreada de los íconos del producto (`public/pwa-512x512.png`,
`public/apple-touch-icon.png`) y está definida como tokens en `@theme`, en `src/index.css`:

| Token    | Base      | Uso                                   |
| -------- | --------- | ------------------------------------- |
| `brand`  | `#3BD1F9` | resaltados y series de gráficos       |
| `accent` | `#1872F9` | botones primarios y elementos activos |
| `ink`    | `#00475C` | sidebar y fondos oscuros              |

`public/eh.png` es el logo del cliente: aparece en el header de la app y al pie del login
("para El Halcón").
