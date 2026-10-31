# Plan de acción — Sorteos por marca

> **Estado: implementado** (2026-09-23). Las rutas `/sorteos`, `/sorteos/nuevo` y `/sorteos/:id`
> están en `src/features/sorteos/`, y el README del repo documenta la pantalla terminada. Este
> documento queda como el registro de las decisiones y de la fase 2.
>
> **Lo que cambió respecto del plan original, al construirlo:**
>
> - **Los premios no se guardan con un diff.** Se pensó `useGuardarPremios` con comparación contra
>   el servidor; terminó siendo una mutación por operación (crear, editar, borrar, reordenar). El
>   sorteo ya existe como borrador, así que no hay nada que acumular en memoria y no hay que
>   decidir qué hacer cuando la mitad de las filas entra.
> - **Apareció una RPC que el plan no tenía**: `sorteo_premios_reordenar`. `unique (sorteo_id,
>   orden)` no es deferrable, así que permutar dos órdenes desde el cliente choca en el medio
>   aunque el estado final sea válido.
> - **Los premios llevan imagen** (pedido después del plan): columna `sorteo_premio.imagen_path` y
>   bucket `sorteos` de Storage, los dos agregados a `schema_sorteos.sql`.
> - **Sin paginación en el listado.** Son unidades por año, no miles; hay un techo de 300 filas.
> - **No se usa el embedding de PostgREST** para leer un sorteo con sus hijas: los tipos de este
>   repo están escritos a mano y no declaran relaciones. Son tres consultas en paralelo.

Pantalla para **dar de alta y administrar sorteos por marca**, con sus premios, dentro de
Factyble Cloud.

El esquema ya está escrito y versionado en el backend:
`factyble-back/supabase/schema_sorteos.sql`. Ese archivo es la fuente de verdad del modelo y
contiene la justificación de cada decisión; este documento es el plan del **front** y el orden
en que conviene construirlo.

---

## 1. Alcance

**Entra en esta fase**

- Listado de sorteos, con filtros y búsqueda por nombre y por marca.
- Alta y edición de un sorteo: nombre, descripción, período de participación, fecha de sorteo,
  compra mínima.
- Asociarle **una o varias marcas** del catálogo ya replicado (`marca`).
- Cargar la **lista de premios**, ordenada, con cantidad, valor estimado y —opcionalmente— la
  marca del sorteo que aporta cada premio.
- Ciclo de vida: publicar (`BORRADOR → ABIERTO`), cerrar, cancelar, borrar un borrador.

**No entra, y es deliberado**

- El **cruce con las facturas** (quién compró qué marca en el período). Es la fase 2; la
  sección 8 dice cómo encaja y por qué no obliga a cambiar nada de lo de acá.
- La **selección de ganadores**. El estado `SORTEADO` ya existe en el modelo y ya es terminal e
  inmutable, justamente para que cuando llegue, sea creíble.
- El **formulario público de participación**. Ya existe y vive en otro lado: un Worker de
  Cloudflare que llama a `registrar_cliente_sorteo`. Ver `schema_clientes.sql`.

---

## 2. Decisiones tomadas

| Decisión | Qué se eligió | Por qué |
| --- | --- | --- |
| Marcas por sorteo | **Varias** (tabla puente `sorteo_marca`) | El caso normal es una, pero el sorteo conjunto de tres proveedores existe y modelarlo después obliga a migrar filas. |
| Premios | **Propios del sorteo** (`sorteo_premio`), no catálogo por marca | "Una heladera Philco" se escribe una vez y no vuelve. Un catálogo sería una tabla para ahorrar tipear un nombre. |
| Escritura | **INSERT/UPDATE directo** con políticas RLS, sin RPC | Menos SQL y el CRUD sale natural con `supabase.from(...)`. El precio se paga con triggers (ver 4.2). |
| FK contra `marca` | **Sí**, compuesta por `(empresa_id, codigo)` | El sync **nunca borra marcas** (`nubeSyncService.js`, `SQL_UPSERT_MARCAS`), así que la FK no puede romper una corrida — a diferencia de `factura_detalle.marca_id`, que no la tiene. |
| Fechas | `date`, no `timestamptz` | El período es de días calendario de Asunción, igual que el índice `factura_dia_asuncion_idx` que va a usar el cruce. |

---

## 3. El modelo, en una vista

```
empresa ──┬── sorteo ──────┬── sorteo_marca ──> marca   (FK compuesta por empresa_id + código)
          │  nombre        │     marca_codigo
          │  estado        │     marca_nombre  (nombre CONGELADO al publicar)
          │  fecha_inicio  │
          │  fecha_fin     └── sorteo_premio
          │  fecha_sorteo        orden, nombre, cantidad, valor_estimado
          └─ monto_minimo        marca_codigo ──> sorteo_marca  (opcional: qué marca lo aporta)

v_sorteo = sorteo + empresa + conteo de marcas y premios + marcas_texto (para filtrar)
```

Dos cosas que conviene tener claras antes de escribir la pantalla:

1. **`marca_nombre` vs `marca.nombre`** — es la misma distinción congelado/vigente que ya existe
   en el detalle de factura. `sorteo_marca.marca_nombre` es cómo se llamaba la marca cuando se
   publicó el sorteo (lo que decía el afiche) y es **lo que se muestra**; `marca.nombre` es el
   nombre vigente y es por el que se **filtra y agrupa**. El front muestra el congelado y no
   necesita join para listar: `v_sorteo.marcas_texto` ya trae el vigente para el `ilike`.

2. **Todo sorteo nace en `BORRADOR`** y es el único estado editable. Ver 4.2.

---

## 4. Backend — qué hay que aplicar

### 4.1 Aplicar el archivo

```bash
psql "$NUBE_DB_URL" -f supabase/schema_sorteos.sql
```

Requisitos previos: `schema.sql` aplicado (crea `empresa` y `marca`) y el catálogo de marcas
cargado (`npm run sync:marcas` en el on-prem). **Sin marcas no se puede dar de alta un sorteo**:
la FK lo impide, a propósito.

Después de aplicar, correr las cuatro consultas de la sección **AUDITORÍA** del archivo. La (4)
prueba las invariantes del ciclo de vida y vale la pena correrla: los triggers se aplican también
al dueño de la base, así que se puede verificar desde el SQL Editor.

### 4.2 Las tres invariantes que el front no tiene que reimplementar

Al escribir directo (sin RPC), cualquier sesión autenticada puede mandar cualquier `UPDATE`. Por
eso tres reglas viven en triggers, y el front las **acompaña en la UI** pero no las sustituye:

| Regla | Qué implica para la pantalla |
| --- | --- |
| Marcas y premios se editan **sólo en `BORRADOR`** | En `ABIERTO`/`CERRADO`/`SORTEADO`/`CANCELADO` los editores de marcas y premios van en modo lectura. Para modificar, el sorteo vuelve a `BORRADOR`. |
| Salir de `BORRADOR` exige **≥ 1 marca y ≥ 1 premio** | El botón "Publicar" queda deshabilitado con un motivo visible mientras falte alguno. |
| `SORTEADO` es inmutable y sólo se borra un `BORRADOR` | "Eliminar" aparece únicamente en borradores; en el resto la acción es "Cancelar". |

Los errores llegan como `PT409` con el campo culpable en `hint` (`estado`, `marcas`, `premios`).
Conviene un mapa `hint → mensaje` en el front, igual que se hace con los errores de auth en
`src/auth/errors.ts`.

### 4.3 El alta son tres requests, y eso está resuelto

PostgREST no tiene transacciones multi-tabla, así que crear un sorteo completo es:

```
insert sorteo (estado BORRADOR)  ->  insert sorteo_marca[]  ->  insert sorteo_premio[]
```

Un corte en el medio deja un sorteo incompleto — que es exactamente lo que es: **un borrador**, y
el formulario lo retoma. La invariante de la regla 2 garantiza que ese borrador incompleto nunca
pueda llegar a `ABIERTO`. **No hace falta un RPC transaccional para el alta.**

---

## 5. Front — archivo por archivo

Se sigue la estructura de `src/features/<feature>/` que ya usan `dashboard` y `facturas`.

### 5.1 Tipos — `src/types/database.ts`

Agregar, en `Database['public']`:

- `Tables.sorteo`, `Tables.sorteo_marca`, `Tables.sorteo_premio`, cada una con `Row`, `Insert` y
  `Update`. **Los `Insert` importan**: es la primera vez que este archivo declara escrituras.
  En `sorteo`, `estado`, `creado_por`, `creado_en` y `actualizado_en` van **fuera del `Insert`**
  (los pone la base; ver 4.2) — que el tipo no ofrezca mandarlos evita el bug antes de escribirlo.
- `Views.v_sorteo` con su `Row`.
- Al final, los alias: `Sorteo`, `SorteoListado` (la fila de `v_sorteo`), `SorteoMarca`,
  `SorteoPremio`, `EstadoSorteo` (union de los cinco estados).

### 5.2 API — `src/features/sorteos/api.ts`

Mismo patrón que `features/facturas/api.ts`: un objeto `claves` con las query keys, hooks de
lectura con `useQuery` y —esto es nuevo en el proyecto— hooks de escritura con `useMutation`.

Lectura:

- `useSorteos(filtros)` — `from('v_sorteo')` con `count: 'exact'`, filtro por `estado`, rango de
  fechas contra `fecha_inicio`/`fecha_fin`, e `ilike` sobre `nombre` y `marcas_texto` según el
  ámbito de búsqueda. `keepPreviousData`, como el listado de facturas.
- `useSorteo(id)` — la cabecera más sus hijas. Acá **sí** conviene el embedding de PostgREST, que
  funciona porque `sorteo_marca` y `sorteo_premio` tienen FK simple a `sorteo`:
  `from('sorteo').select('*, sorteo_marca(*), sorteo_premio(*)').eq('id', id).single()`.
- `useMarcasDisponibles()` — `from('marca').select('id, codigo, nombre').order('nombre')` para el
  selector. `authenticated` ya tiene `select` sobre `marca` desde `schema.sql`: no hay que tocar
  permisos.
- `useEmpresas()` — `from('empresa').select('id, nombre')`. Son una o dos filas; si es una sola, el
  formulario no muestra el campo y la usa en silencio.

Escritura (todas invalidan `['sorteos']` y la clave del sorteo tocado):

- `useCrearSorteo()` — inserta la cabecera en `BORRADOR` y devuelve el `id`.
- `useActualizarSorteo()` — `update` de la cabecera.
- `useGuardarMarcas()` — diff contra lo que había: `delete` de las que se sacaron, `insert` de las
  nuevas. La PK es `(sorteo_id, marca_codigo)`, así que **no hay `update`** de una fila de
  `sorteo_marca`: se borra y se inserta.
- `useGuardarPremios()` — mismo diff, más `update` de los que cambiaron.
- `useCambiarEstado()` — un `update` de `estado`. Es la acción que puede fallar con `PT409`.
- `useEliminarSorteo()` — `delete`, sólo ofrecido en `BORRADOR`.

⚠️ Al quitar una marca que tiene premios asociados, la FK borra esos premios en cascada
(`sorteo_premio_marca_fkey`). **El front tiene que avisar antes**: "esta marca aporta 2 premios,
se van a quitar". Es la única pérdida de datos silenciosa del modelo.

### 5.3 Pantallas y componentes

```
src/features/sorteos/
  SorteosPage.tsx              listado + acciones
  SorteoFormPage.tsx           alta y edición (ruta propia, no modal: el formulario
                               tiene tres secciones y se navega con el sorteo abierto)
  useSorteosParams.ts          filtros en la URL, igual que useFacturasParams
  api.ts
  components/
    TablaSorteos.tsx           tabla en >=lg, lista en mobile (igual que TablaFacturas)
    FiltrosSorteos.tsx         estado + rango + búsqueda con ámbito (nombre | marca)
    BadgeEstadoSorteo.tsx      un color por estado, sobre el Badge que ya existe
    FormularioSorteo.tsx       los campos de la cabecera
    SelectorMarcas.tsx         multi-selección sobre el catálogo, con buscador
    EditorPremios.tsx          lista editable: agregar, reordenar, quitar
    AccionesSorteo.tsx         publicar / cerrar / cancelar / eliminar, con confirmación
```

Reutilizar de `components/ui`: `Card`/`CardHeader`, `Button`, `Input`, `Select`,
`DateRangePicker`, `Badge`, `EmptyState`, `ErrorState`, `SkeletonRows`. **No hay que crear
primitivas nuevas**, salvo dos que el proyecto todavía no tiene y este formulario sí necesita:
`Textarea` (descripción) y una confirmación de acción destructiva — un `ConfirmDialog` chico en
`components/ui`, que además le va a servir a cualquier pantalla futura.

### 5.4 Ruteo y navegación

- `src/App.tsx` — dos rutas nuevas, con `lazy` + `Suspense` como las otras dos pantallas:
  `sorteos` y `sorteos/:id`. Que el formulario tenga URL propia es lo que hace que un borrador a
  medias se pueda retomar y compartir.
- `src/layouts/Sidebar.tsx` — un `NAV_ITEMS` más: `{ to: '/sorteos', label: 'Sorteos', icon: Gift }`
  (`lucide-react` ya está).

### 5.5 Documentación que queda desactualizada

- **`README.md` del front dice "esta aplicación nunca escribe"**, en el primer párrafo, y con esta
  pantalla deja de ser cierto. Hay que corregirlo y agregar `sorteos` a la sección "Pantallas" y
  las tres tablas + `v_sorteo` a "Lo que el front consume".
- **`factyble-back/supabase/README.md`** — sumar `schema_sorteos.sql` a la tabla de piezas y al
  procedimiento de reset (el orden es `schema.sql` → `schema_clientes.sql` → `seed_ciudades.sql` →
  `schema_sorteos.sql`, y el reset tiene que dropear `sorteo_premio`, `sorteo_marca` y `sorteo`).

---

## 6. Orden de implementación

1. **Aplicar `schema_sorteos.sql`** y correr las cuatro consultas de auditoría.
2. **Tipos** en `src/types/database.ts`.
3. **`api.ts` sólo con la lectura** + `SorteosPage` con la tabla vacía. Verifica de una que los
   permisos y el RLS quedaron bien antes de escribir una línea de formulario.
4. **Alta de la cabecera**: `FormularioSorteo` + `useCrearSorteo`, que ya crea un `BORRADOR` real.
5. **`SelectorMarcas`** y `useGuardarMarcas`.
6. **`EditorPremios`** y `useGuardarPremios`, incluido el aviso de la cascada.
7. **`AccionesSorteo`** y el mapeo de los `PT409` a mensajes.
8. **Listado completo**: filtros, búsqueda, paginación, estados vacío/error.
9. **Ruta en `App.tsx` y ítem en el `Sidebar`** (recién acá, para no publicar una pantalla a medias).
10. **Actualizar los dos README** y correr `npm run lint && npm run build`.

Los pasos 1–3 son verificables solos y valen como corte: si el listado trae filas cargadas a mano
desde el SQL Editor, el resto es UI.

---

## 7. Riesgos y cosas que se rompen fácil

- **`42501 permission denied for sequence sorteo_id_seq`.** Si el `INSERT` falla con esto, faltan
  los `grant usage on sequence` del final de `schema_sorteos.sql`. El error no menciona la tabla y
  se busca en el lugar equivocado.
- **La pantalla no ve las tablas nuevas.** PostgREST cachea el esquema. El archivo termina con
  `notify pgrst, 'reload schema'`, pero si se aplicó por partes desde el SQL Editor, hay que
  correr esa línea sola.
- **`insert` con `estado: 'ABIERTO'` falla siempre.** No es un bug: una fila recién creada no tiene
  marcas ni premios. El alta crea un `BORRADOR` y publicar es un segundo `update`.
- **Quitar una marca borra sus premios.** Es la cascada de `sorteo_premio_marca_fkey`. Sin el aviso
  previo en la UI, es pérdida de datos silenciosa.
- **El catálogo de marcas puede estar vacío.** Sobre una base recién reseteada, `SelectorMarcas`
  no muestra nada y el sorteo no se puede completar. El `EmptyState` tiene que decir qué falta
  (`npm run sync:marcas`), no sólo "sin resultados".
- **`using (true)` significa que cualquier usuario autenticado puede borrar cualquier borrador.**
  Es el modelo de todo el proyecto (el único usuario es el dueño), pero es lo primero que hay que
  acotar el día que haya un usuario de sucursal. El ⚠️ está en el archivo SQL.
- **Nada de esto se crea a mano en el SQL Editor.** Es la regla del proyecto y ya se rompió una vez,
  con dos vistas sin `security_invoker` y con `grant` a `anon` que el Security Advisor marcó como
  CRITICAL. Si el front necesita una vista o una RPC nueva, se agrega a `schema_sorteos.sql`.

---

## 8. Fase 2 — el cruce con las ventas

Para cuando llegue. No obliga a cambiar nada de lo anterior, y el archivo SQL lo desarrolla en su
sección final. Los tres puntos que hay que decidir antes de escribir una línea:

1. **El join con el padrón es por cédula, no por RUC.** `cliente_sorteo.documento` guarda la cédula
   en dígitos; la factura trae `receptor_documento`, `receptor_ruc` (cédula + DV) y `receptor_dv`.
   Unir contra `receptor_ruc` a secas no matchea nunca.
2. **El resultado no puede devolver el padrón.** `cliente_sorteo` tiene RLS con cero políticas: ni
   `anon` ni `authenticated` leen una fila, y fue una decisión explícita porque son datos personales
   de terceros. El cruce tiene que ser una RPC `security definer` que devuelva lo mínimo — un conteo
   de participantes, o el ganador con el teléfono enmascarado — y nunca un listado.
3. **La participación se congela, no se calcula al vuelo.** Si una factura del período se cancela
   después, el resultado cambiaría; para un sorteo ya realizado eso es inaceptable. Lo previsible es
   `sorteo_participacion` materializada al pasar a `CERRADO` y `sorteo_ganador` al pasar a
   `SORTEADO`. Por eso `SORTEADO` ya es terminal e inmutable desde esta fase.
