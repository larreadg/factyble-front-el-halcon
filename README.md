# Factyble Cloud · El Halcón

Panel de **El Halcón Ferretería** sobre Supabase: consulta de las facturas electrónicas
(SIFEN, Paraguay) y administración de los sorteos por marca.

**Qué escribe y qué no.** El espejo de facturas es de **sólo lectura** —lo llena un cron del
on-prem con el rol `postgres` y ninguna pantalla lo modifica—, mientras que los **sorteos** sí se
dan de alta desde acá: `sorteo`, `sorteo_marca` y `sorteo_premio` son las tres únicas tablas de la
base sobre las que el rol `authenticated` tiene INSERT/UPDATE/DELETE, más el bucket `sorteos` de
Storage para las imágenes de los premios. Si una pantalla nueva necesita escribir en otra tabla,
eso es una decisión de esquema y va en el repo del backend, no acá.

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

# Formulario publico de sorteos (/public/clientes). Ver mas abajo.
VITE_FUNCIONES_URL=https://<proyecto>.supabase.co/functions/v1
VITE_TURNSTILE_SITE_KEY=<site key de Turnstile>
```

Se usa **sólo la anon key**. La `service_role` no va nunca en el front: lo que un usuario
autenticado puede hacer lo decide el RLS de la base, y ahí está acotado a leer el espejo y a
administrar sorteos.

## El esquema de la base vive en el backend

Todo el destino —tablas, vistas, RPC, permisos y RLS— está en el repo del backend, repartido en
tres archivos por modelo de permisos, no por tema:

| Archivo                                              | Qué define                                                   | Quién escribe                                                |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `factyble-back/supabase/schema.sql`                  | El espejo de facturas y las RPC del dashboard                | Sólo el cron, como `postgres`                                |
| `factyble-back/supabase/schema_clientes.sql`         | El padrón público de participantes                           | `anon`, vía RPC, desde tres Edge Functions                   |
| `factyble-back/supabase/schema_verificacion.sql`     | La verificación del celular por SMS que autoriza ese alta    | `anon`, vía RPC, desde tres Edge Functions                   |
| `factyble-back/supabase/schema_sorteos.sql`          | Los sorteos, sus marcas, sus premios y el bucket de imágenes | **Este front**, como `authenticated`                         |
| `factyble-back/supabase/schema_sorteo_ejecucion.sql` | El bolillero y el acta de cada premio                        | **Este front**, vía RPC, como `authenticated`                |
| `factyble-back/supabase/schema_sorteo_publico.sql`   | El sorteo verificable y la constancia pública                | **Este front** como `authenticated`; `anon` sólo lee una RPC |

**Nada se crea a mano en el SQL Editor de Supabase, y este repo no versiona SQL.** Antes sí: había
dos `.sql` acá y cuatro de las cinco RPC del dashboard no estaban en ningún repo, creadas a mano en
el editor. Un reset de la base las borraba sin que nadie tuviera cómo recrearlas. Si el front
necesita una vista o una RPC nueva, se agrega en ese archivo.

### Lo que el front consume

| Objeto                                                                                                                          | Qué da                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `v_factura`                                                                                                                     | Cabecera con el emisor resuelto — listado y panel de detalle                                    |
| `v_factura_busqueda`                                                                                                            | `v_factura` + `items_texto` + `marcas_texto`, para buscar por lo que se vendió y por su marca   |
| `v_factura_item`                                                                                                                | Los ítems, con marca y código de producto                                                       |
| `sync_corrida`                                                                                                                  | Bitácora del sync, para el indicador de "última sincronización"                                 |
| `dashboard_resumen` · `dashboard_por_periodo` · `dashboard_top_receptores` · `dashboard_top_productos` · `dashboard_top_marcas` | Las RPC del dashboard                                                                           |
| `dashboard_por_establecimiento`                                                                                                 | Existe en el schema; el front **todavía no la consume**                                         |
| `v_sorteo`                                                                                                                      | Sorteo + empresa + conteo de marcas y premios — el listado de sorteos                           |
| `sorteo` · `sorteo_marca` · `sorteo_premio`                                                                                     | Lectura y **escritura**: el formulario de alta y edición                                        |
| `marca` · `empresa`                                                                                                             | El catálogo para elegir marcas y la empresa del sorteo                                          |
| `sorteo_premios_reordenar`                                                                                                      | RPC que reasigna el orden de los premios en una transacción                                     |
| Bucket `sorteos` de Storage                                                                                                     | Las imágenes de referencia de los premios (`premios/<sorteo_id>/…`)                             |
| `sorteo_participantes` · `sorteo_iniciar` · `sorteo_ejecutar_premio` · `sorteo_estado_presentacion`                             | Las RPC del sorteo en vivo: el bolillero, congelarlo, sortear un premio y retomar tras recargar |
| `v_sorteo_resultado`                                                                                                            | Las actas ya escritas, con el premio y el ganador resueltos                                     |
| `sorteo_resultado_publico`                                                                                                      | La constancia pública — la única RPC que `anon` puede ejecutar                                  |
| `v_cliente_sorteo` · `cliente_sorteo` · `cliente_sorteo_historial` · `ciudad`                                                   | El padrón: lectura, edición y su bitácora                                                       |

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

- **Sorteos** (`/sorteos`, `/sorteos/nuevo`, `/sorteos/:id`) — la única pantalla que escribe.
  Listado con filtro por estado y buscador de dos ámbitos (`nombre` y `marca`, param `en`), y un
  formulario de alta y edición en tres secciones numeradas: **definición**, **marcas** y
  **premios**.

  **Las secciones están numeradas porque son una dependencia real, no un adorno.** `sorteo_marca` y
  `sorteo_premio` son tablas hijas: no se pueden insertar sin un `sorteo_id`, y PostgREST no tiene
  transacciones multi-tabla. Entonces el paso 1 guarda y **crea un borrador** —de ahí el
  `/sorteos/nuevo` que redirige a `/sorteos/:id`—, y los pasos 2 y 3 editan un sorteo que ya
  existe, guardando cada cambio en el momento. Lo peor que puede dejar un corte de luz es un
  borrador incompleto: que es lo que es, que la URL permite retomar, y que la base no deja
  publicar.

  **Las tres reglas del ciclo de vida las hace cumplir la base, no el formulario**, y el front las
  refleja para no ofrecer acciones que van a ser rechazadas:

  | Regla (trigger en `schema_sorteos.sql`)             | Cómo se ve en la pantalla                                                                                    |
  | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
  | Marcas y premios se editan sólo en `BORRADOR`       | En los demás estados las dos secciones se muestran con candado y en lectura                                  |
  | Salir de `BORRADOR` exige ≥ 1 marca y ≥ 1 premio    | El panel de la derecha lleva la lista de requisitos y "Publicar" está deshabilitado con el motivo a la vista |
  | `SORTEADO` es terminal; sólo se borra un `BORRADOR` | "Eliminar" aparece únicamente en borradores; el resto se cancela                                             |

  El panel **no ofrece marcar un sorteo como `SORTEADO`**: esta pantalla no elige ganadores, y
  hacerlo lo congelaría para siempre sin un solo ganador registrado. Ese estado lo pone la base
  cuando se sortea el último premio, desde la pantalla de presentación (más abajo).

  **Las imágenes de los premios** van al bucket `sorteos` de Storage, que es público a propósito
  (son fotos de premios, material de marketing). Se reducen a 1200 px y se reencodean en WebP en el
  navegador antes de subir: una foto de celular de 5 MB no entra en el techo de 2 MB del bucket, y
  no tiene sentido mandarla para mostrar una miniatura. La tabla guarda la **ruta**
  (`premios/<sorteo_id>/<archivo>`), nunca la URL, así que mudar el proyecto de Supabase no
  invalida ninguna fila. El archivo se sube antes de guardar la fila y el anterior se borra recién
  después: así lo peor que puede quedar es un archivo huérfano —invisible— y nunca un premio con la
  foto rota.

  **Quitar una marca borra los premios que aportaba**, por la FK en cascada. El selector avisa
  antes, con los nombres de los premios que se van.

## Los tres listados

Facturas, sorteos y padrón son la misma pantalla con datos distintos, y desde que son tres comparten
las piezas: `components/ui/Tabla.tsx` (la lista de celular, la tabla de escritorio, el encabezado
ordenable, la acción de fila) y `components/ui/PanelListado.tsx` (el encabezado de la pantalla y la
tarjeta con sus estados).

Antes no las compartían y se notaba: dos anchos mínimos, dos copias literales del encabezado que
ordena, tres anchos para la columna de acciones, tres formas de armar la tarjeta de celular —una con
el botón en posición absoluta encima— y el aviso de «actualizando» arriba en dos pantallas y suelto
abajo en la tercera. Nada de eso era una decisión.

**La lista es la vista base y la tabla es lo que se gana en `lg`.** Por eso en `Tabla.tsx` la lista
está escrita arriba y la tabla abajo: ese es el orden en que se decide. De ahí salen dos reglas que
no son cosméticas: el control de cada fila mide 40px de alto en el celular y se compacta a 32 en
escritorio, y el título de la tarjeta usa dos renglones antes que truncar, porque en un celular el
nombre es lo único por lo que se reconoce una fila.

**Toda fila termina en una acción con nombre** — «Ver detalle», «Abrir», «Ver ficha» —, no en una
fila entera clickeable. El listado de sorteos era lo segundo hasta que existieron los tres: dos
gramáticas para la misma acción en pantallas vecinas. El sorteo sigue siendo un `<Link>`, así que
abrirlo en otra pestaña funciona igual que antes.

**El aviso de que se está actualizando va junto al título**, no sobre la lista. La barra de 32px que
había reservaba alto en todas las pantallas para algo que casi nunca se ve, y en un celular esos
32px son media fila. La lista además se atenúa: son dos señales de lo mismo y ninguna mueve el
contenido de lugar.

Lo que sí difiere entre las tres son diferencias reales, no de estilo: facturas tiene pie de totales
porque suma, y sorteos no tiene paginación porque la consulta los trae todos —un pie que dijera
«Mostrando 1–4 de 4» sería una barra para no decir nada.

## El sorteo en vivo (`/sorteos/:id/presentar`) y la constancia (`/sorteo/resultado/:slug`)

Un sorteo `CERRADO` se sortea desde una pantalla aparte: **fuera del layout admin**, sin sidebar ni
header, ocupando el viewport entero. No es una decisión estética. Esta pantalla se **graba** y el
video se sube a Instagram, TikTok y Facebook, así que nada que diga "Factyble Cloud" ni el correo
del operador puede aparecer en cámara. Se abre en una pestaña nueva desde el listado y desde el
detalle, y sigue exigiendo sesión: no hay ningún enlace público que permita ejecutar ni mirar un
sorteo en vivo.

Cuando termina, deja una **página pública de resultados** en `/sorteo/resultado/<slug>` — un enlace
largo e impredecible, sin sesión, que es lo que se comparte.

### Quién elige al ganador

La base. Nunca el navegador.

Al entrar a la pantalla se llama a `sorteo_iniciar`, que en una sola transacción:

1. **congela** la lista de facturas participantes en `sorteo_bolillero` y publica su SHA-256;
2. genera una **semilla** de 32 bytes con `gen_random_bytes`, la guarda en una tabla con RLS y
   **cero políticas** —nadie la lee, ni siquiera `authenticated`— y publica sólo su SHA-256.

Después, cada premio se sortea con `sorteo_ejecutar_premio`, que deriva la posición ganadora de
`hmac(semilla, 'premio:<id>')`. Al sortearse el último premio, el sorteo pasa a `SORTEADO`, se le
asigna el slug y **se revela la semilla**.

Eso hace el sorteo **verificable**: como el hash de la lista y el compromiso de la semilla se
publican antes de conocerse ningún ganador, cualquiera puede rehacer la cuenta después y tiene que
llegar a los mismos nombres. Si El Halcón hubiera querido cambiar un ganador, alguno de los dos
hashes no cerraría. La página pública explica el procedimiento y publica los tres valores.

La animación de la pantalla **revela algo que ya está escrito**: es teatro, y está bien que lo sea.
El hecho es la fila de `sorteo_resultado`, con un `unique (premio_id)` que hace que el primer
sorteo de un premio sea el único. Si el servidor falla, la animación se corta y se dice qué pasó:
nunca se muestra un ganador falso.

### Por qué un contador de siete dígitos y no una ruleta

Lo que participa es la **factura**, no la persona, así que lo que se sortea es un número. Y eso
resuelve de paso el problema de toda ruleta de nombres: con 900 clientes los gajos quedan de un
grado y no se distingue nada en una grabación. Siete dígitos se leen igual con 74 facturas que con
90.000, y durante el sorteo **no aparece ningún nombre en pantalla**.

### Lo que hay que saber para grabar

| Tecla               | Qué hace                                                              |
| ------------------- | --------------------------------------------------------------------- |
| `Espacio` · `Enter` | Sortear el premio actual, o pasar al siguiente (y al podio, al final) |
| `F`                 | Pantalla completa                                                     |
| `H`                 | Modo limpio: esconde encabezado, controles y riel de premios          |
| `M`                 | Sonido (sintetizado con Web Audio; no hay archivos ni licencias)      |
| `?`                 | La ayuda; `Esc` la cierra                                             |

Además hay tres **encuadres**: `Libre`, `16:9` y `9:16`. Los dos últimos encierran la escena en esa
proporción y la centran, para saber exactamente qué va a entrar en el video.

Ese lienzo es un **container query** (`container-type: size`), y todos los tamaños fluidos de la
escena están en `cqw`/`cqh` en vez de `vw`/`vh`. Medido contra la ventana, en 9:16 un título de
`4.6vw` daba 82 px sobre un lienzo de 460: los nombres de los ganadores se truncaban a cero y el
riel de premios se montaba sobre el QR. El confeti, por la misma razón, dibuja sobre un canvas
propio adentro del lienzo: si no, los dos cañones disparan desde los bordes de la **pantalla** y en
9:16 quedan fuera de cuadro.

Si el sistema pide **movimiento reducido**, el número aparece de una y no hay confeti — y aparece
un botón más en los controles para pedir la animación completa igual, porque quien graba puede
tener esa preferencia puesta por su uso diario. Es lo único que la anula, y sólo en esta pantalla.

El cursor se esconde solo a los dos segundos, y recargar a mitad de un sorteo **retoma donde
estaba**: qué premios faltan, el bolillero congelado y los hashes viven en el servidor, no en el
navegador.

### Cuánto vale una chance

Por defecto, **una factura que califica vale una chance**, compre lo que compre. Ese modelo tiene un
incentivo al revés y se ve con los números de un sorteo real: comprar 926.500 Gs. de una vez valía
lo mismo que comprar 51.000, y fraccionar esa misma compra en tres tickets valía el triple. No
premiaba comprar más: premiaba pasar más veces por la caja.

Por eso el sorteo tiene `guaranies_por_cupon`. Con un valor —5.000, por ejemplo— cada factura vale
`floor(monto_marcas / 5.000)` cupones y el sorteo se hace sobre cupones. El monto es siempre **el
comprado de las marcas del sorteo**, no el total de la factura. En el mismo sorteo, eso lleva un
bolillero de 70 facturas a 1.873 cupones, y a quien compró 926.500 de 1,43 % a 9,88 %.

El resto **se redondea para abajo** y no hay tope: con cupones de 5.000, una compra de 4.999 no
participa —la regla es «cada 5.000, un cupón», y participar con cero chances es lo mismo que no
participar— y una de 900.000 vale 180 cupones sin techo. `monto_minimo_compra` sigue siendo una cosa
aparte: es la puerta de entrada, y se puede combinar con los cupones o usar sola.

Dejarlo en blanco mantiene el modelo de una chance por factura, que es lo que tienen todos los
sorteos hechos hasta ahora.

**Con el bolillero congelado ya no se puede cambiar**, ni el valor del cupón ni el mínimo: el hash
publicado se calculó sobre esa lista con esas reglas, y cambiarlas después dejaría al sorteo
contando una cosa y habiendo hecho otra. Lo impide un trigger.

#### Qué cambia en la verificación

El texto que se hashea depende del modelo, y por eso la constancia pública publica las reglas junto
a los hashes:

| Modelo                 | Lista que se hashea      | Índice derivado           |
| ---------------------- | ------------------------ | ------------------------- |
| Una chance por factura | `id,id,id…`              | posición 1..facturas      |
| Cupones                | `id:cupones,id:cupones…` | cupón 1..total de cupones |

Con cupones, el cupón ganador se mapea a su factura por **suma acumulada**: los cupones no se
materializan —una factura de 926.500 no son 185 filas, es una fila que vale 185— y gana la primera
cuya acumulación alcanza el número sorteado. Con una chance por factura el acumulado es 1, 2, 3… y
la cuenta da exactamente lo mismo que antes, que es lo que hace que **las actas anteriores al cambio
sigan verificando con su hash guardado**.

### El teléfono del ganador

Un sorteo elige una **factura**, y una factura no trae teléfono: trae el RUC y el nombre del
receptor. El teléfono está en el padrón —la gente que se anotó en `/public/clientes`—, así que la
vista `v_sorteo_resultado` cruza las dos por documento y el detalle del sorteo muestra, arriba de
todo, quién ganó y cómo avisarle (con enlace a WhatsApp cuando el número está).

Ese cruce **no es una igualdad pelada**, y la razón es un caso real: la factura dice `855866-3` y el
padrón `0855866`. Son la misma persona —una cédula paraguaya de seis dígitos se escribe con y sin
cero adelante— y con `=` a secas el ganador quedaba sin teléfono sin que nadie pudiera explicar por
qué. El join compara sin ceros a la izquierda y descarta el caso degenerado (`receptor_ruc` en `'0'`,
que es como viaja el consumidor final). `documento` es UNIQUE en el padrón, así que el LEFT JOIN no
puede duplicar un acta.

Cuando el cruce acierta pero **los dos nombres no coinciden**, la fila lo dice en ámbar: mismo
documento y distinto nombre significa que alguno está mal escrito, o que no es la misma persona, y
eso hay que verlo antes de mandar el mensaje. Cuando no hay cruce, la fila no deja un guión: dice que
esa persona no está en el padrón, muestra su documento y ofrece darla de alta.

Esta es la única pantalla donde el ganador aparece con nombre completo, documento y teléfono. Está
detrás de sesión y no se graba ni se comparte; el enmascarado existe para las dos que sí ven
terceros —la presentación y la constancia pública—, y ahí el teléfono no aparece nunca.

### Los nombres, enmascarados

Por defecto se muestra `JORGE O.` — primer nombre y la inicial del siguiente — tanto en la pantalla
que se graba como en la página pública. Alcanza para que el ganador se reconozca y no para que un
tercero lo identifique desde un video. El interruptor está en la configuración del sorteo y se
puede apagar (por ejemplo, cuando el ganador autoriza que se lo nombre); es, junto con publicar o
bajar la página, **lo único que un sorteo ya sorteado admite cambiar**.

Nunca se muestran RUC, cédula, teléfono ni correo. El **número de factura sí va completo**: es lo
que le permite al ganador reconocerse sin exponer su documento.

### Qué puede ver `anon`

Nada, salvo una función. `sorteo_resultado_publico(slug)` es `security definer`, es lo **único**
que `anon` puede ejecutar en todo el módulo, devuelve cero filas si el sorteo no está `SORTEADO` o
está despublicado, y ya enmascara los nombres del lado del servidor. Las tablas `sorteo`,
`sorteo_premio`, `sorteo_resultado`, `sorteo_bolillero`, `sorteo_semilla` y `factura` están
denegadas para `anon`, igual que `sorteo_iniciar`, `sorteo_ejecutar_premio` y `sorteo_participantes`.

Un slug que no existe y uno despublicado dan **el mismo mensaje**: distinguirlos convertiría la
página en un detector de slugs válidos, y el slug es lo único que protege la constancia.

### Las previsualizaciones en redes

Los crawlers de WhatsApp, Facebook e Instagram piden el HTML y leen el `<head>`; no ejecutan
JavaScript. En una SPA eso significa que cualquier link compartido se previsualiza con el título
del panel de facturación. Por eso `netlify/edge-functions/resultado-og.ts` se mete en el medio de
`/sorteo/resultado/*`, consulta la misma función pública y reemplaza el `<title>` y las meta tags
antes de devolver el HTML. Si el slug no existe, está despublicado o Supabase no contesta, devuelve
la página **tal como vino**: una tarjeta linda que anuncia un sorteo inexistente sería peor que
ninguna tarjeta.

Necesita `SUPABASE_URL` y `SUPABASE_ANON_KEY` (o sus equivalentes `VITE_*`) entre las variables de
entorno del sitio en Netlify.

## El padrón (`/padron`)

La lista de quienes dejaron sus datos en el formulario público, y la única
pantalla desde la que se pueden **corregir y borrar**.

Lo segundo no es un extra: el texto de consentimiento que cada persona acepta
dice _"puedo pedir que los borren cuando quiera, en el local"_, y hasta que
existió esta pantalla eso sólo se podía cumplir entrando al panel de Supabase.

| Qué                       | Cómo                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Listado                   | `v_cliente_sorteo`, paginado y ordenable del lado del servidor                                        |
| Búsqueda                  | un `ilike` contra la columna `busqueda` de la vista — nombre, documento, RUC, celular y ciudad en una |
| Filtro                    | por celular verificado por SMS o no                                                                   |
| Editar / agregar / borrar | panel lateral; el borrado pasa por `ConfirmDialog`                                                    |
| Historial                 | `cliente_sorteo_historial`, lo que decía la ficha antes de cada cambio                                |

### Esta pantalla revirtió una decisión del schema

`cliente_sorteo` **no tenía un solo GRANT** para `authenticated`, y
`schema_clientes.sql` explicaba por qué: _"son datos personales de terceros y
ninguna pantalla del front los necesita"_. Dejó de ser cierta la premisa. El
GRANT nuevo es lo más chico que alcanza —CRUD sobre el padrón, SELECT sobre el
historial y sobre `ciudad`, **nada** sobre `registro_credencial` ni sobre
`verificacion_telefono`— y está razonado en la sección EL PANEL de ese archivo.

### Detalles que no son obvios

- **Editar un dato le saca su sello de procedencia.** Cambiar el nombre pone
  `nombre_verificado` en `false`, y cambiar el celular pone `telefono_verificado`
  en `false`. Un nombre corregido a mano ya no es "el de sus facturas" y un
  teléfono tipeado en el mostrador no pasó por ningún SMS: dejar el sello puesto
  sería mentir sobre el dato nuevo, justo el día que hay que sortear.
- **`es_empresa` no se manda nunca**: lo deriva un trigger del documento. Antes
  lo calculaba quien insertaba, y mientras la RPC del formulario fue la única
  puerta de escritura alcanzaba; con el panel editando también, un documento
  corregido a mano habría dejado esa columna mintiendo.
- **El historial no se puede editar desde ningún lado.** Es sólo lectura a
  propósito: poder editarlo sería poder tapar lo que se editó.
- **Borrar se lleva el historial** por la FK en cascada, y es lo correcto cuando
  el borrado responde a un "sacame de la lista".
- **No hay exportación.** Una exportación de datos personales es una decisión,
  no una conveniencia; el día que se pida, se piensa.

## El formulario público de sorteos (`/public/clientes`)

La única ruta sin sesión y sin `AppLayout`: la abre gente que no tiene cuenta,
típicamente escaneando un QR en el local. Vive fuera de `ProtectedRoute` y no
espera a que `AuthProvider` resuelva nada.

Cuatro pasos, y el primero es la llave de los otros tres:

| Paso | Qué pide                                         | Contra qué                                                              |
| ---- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 1    | Celular, y un PIN de 4 dígitos que llega por SMS | `verificar-telefono`, con Turnstile delante                             |
| 2    | RUC o cédula                                     | `consultar-documento`, que busca el nombre en las facturas de El Halcón |
| 3    | Ciudad                                           | El catálogo de 249 distritos que viaja en el bundle                     |
| 4    | Repaso y consentimiento                          | `registrar-cliente`                                                     |

### Las tres decisiones que explican el resto

**El SMS es la puerta, no un dato más.** Al acertar el PIN el servidor emite un
token de sesión que vale 20 minutos y sirve para UN alta. Sin él, los pasos 2 y 4
no hacen nada. Eso es lo que hace aceptable que el paso 2 muestre un nombre: sin
esa puerta, el formulario sería un padrón de clientes consultable tecleando, y
las cédulas paraguayas son secuenciales.

**El nombre sale de nuestras propias facturas.** El registro civil del MSPBS no
es alcanzable desde ninguna nube fuera de Paraguay —filtra por origen
geográfico—, así que `sesion_consultar_documento` busca en `public.factura`.
Encuentra a quien ya compró dando su documento; el resto escribe su nombre.

**El navegador no es fuente de nada.** El nombre, el documento y el teléfono los
resuelve el servidor y los guarda contra la sesión, en `verificacion_telefono`.
El alta del paso 4 manda el token, la ciudad y el consentimiento — nada más. No
hay forma de postear un nombre "verificado" que no haya salido de una factura.

**Las reglas del flujo viven en `estado.ts`, no repartidas en los pasos.** Todo
lo cargado después del paso 1 depende del token: si cambia el número, lo demás
dejó de ser válido. Con diez `useState` eso es acordarse de limpiar cinco campos
en el `onClick` de un botón; con un reducer es un caso que se lee de arriba abajo.

### Cómo está partido

```
src/features/publico/
  RegistroClientePage.tsx   la carcasa: hoja, riel, honeypot, los dos desenlaces
  estado.ts                 la máquina de estados y los mensajes de error
  api.ts                    las tres Edge Functions
  validacion.ts             los normalizadores, espejo de la Edge y de los CHECK
  ciudades.ts               catálogo generado — NO editar a mano
  recordado.ts              a quién reconoce este dispositivo (localStorage)
  pasos/                    una pantalla por paso
  components/               riel, campo de PIN, select de ciudad, Turnstile
```

### Detalles que no son obvios

- **El campo de PIN es UN input, no cuatro.** Las cuatro casillas son decoración
  sobre un `<input maxlength="4" autocomplete="one-time-code">` transparente. Con
  cuatro inputs, el autocompletado del SMS llena sólo el primero, pegar el código
  funciona a medias y un lector de pantalla anuncia cuatro campos sueltos.
- **El riel cambia de forma según su propio ancho**, por container query y no por
  breakpoint de viewport: lo que decide es cuánto mide el riel, que depende del
  ancho de la hoja. Abajo de 260 px se cae a números más el nombre del paso actual.
- **Ya no se pide la fecha de nacimiento, y eso tiene un costo.** Era la llave
  que permitía actualizar un registro, y la que impedía que alguien con una
  cédula ajena redirigiera ese teléfono. Lo que quedó en su lugar es el tope de
  tres documentos por celular verificado, el historial de cambios, y que el
  premio se retira con la cédula en la mano. Está razonado en la decisión 3 de
  `schema_verificacion.sql`; si alguna vez se quiere el candado de vuelta, hay
  que devolver el campo al paso 2.
- **El honeypot vive en la carcasa**, no en un paso: tiene que estar en el DOM
  todo el flujo, y los pasos se desmontan al cambiar.
- **Nada del padrón se lee desde este front.** `cliente_sorteo` no tiene un solo
  GRANT para `authenticated`: son datos personales de terceros y ninguna pantalla
  los necesita. Se consultan y se exportan desde el panel de Supabase.

Lo del lado del servidor —los topes, el modelo de permisos, los códigos de
error— está en `factyble-back/supabase/functions/README.md` y en la cabecera de
`factyble-back/supabase/schema_verificacion.sql`.

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
  lib/         supabase.ts, format.ts, dates.ts, paraguay.ts, queryClient.ts, cn.ts
  types/       database.ts
  auth/        AuthProvider, AuthContext, ProtectedRoute, errors
  hooks/       useRangoParams, useDebouncedValue, useTamanioContenedor
  layouts/     AppLayout, Sidebar, Header
  features/
    dashboard/ api.ts + components/ + DashboardPage
    facturas/  api.ts + useFacturasParams + components/ + FacturasPage
    sorteos/   api.ts + apiEjecucion.ts + sonido.ts + mascara.ts + components/
               SorteosPage + SorteoFormPage + PresentarSorteoPage + ResultadoPublicoPage
    padron/    api.ts + usePadronParams + errores.ts + components/ + PadronPage
    publico/   api.ts + estado.ts + pasos/ + components/
  components/ui/   Tabla.tsx y PanelListado.tsx son las piezas de los tres listados
  pwa/         AvisoActualizacion, IndicadorSinConexion
  pages/       LoginPage, NotFoundPage, ConfiguracionFaltante
netlify/
  edge-functions/  resultado-og.ts — las meta tags de la constancia, inyectadas en el servidor
```

`publico/` es el único feature con su propio `estado.ts`: el formulario va por
pasos y las invariantes del flujo no caben en el estado local de una pantalla.
Ver la sección del formulario público.

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
