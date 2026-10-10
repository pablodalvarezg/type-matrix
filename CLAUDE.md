# CLAUDE.md

Guía para Claude Code en el repositorio de **Type Matrix**. Leé este archivo
completo antes de escribir código.

Type Matrix es el side project 2 del portfolio de Pablo (`pablodagdev`). Hereda
de ese repo —vía Atlas, el side project 1— el rol, la arquitectura y las
convenciones; lo que cambia está marcado.

El `README.md` es la especificación: qué hace cada modo, las fórmulas, las reglas
del puzzle diario y el plan de construcción. Este archivo no lo repite; dice
**cómo se trabaja** sobre él. Si los dos se contradicen, preguntá.

> `AGENTS.md` lo escribe `next dev`, y tiene razón: esta versión de Next difiere
> de lo que un modelo tiene en su training data. Leé `node_modules/next/dist/docs/`
> antes de usar una API de Next.

## Rol

Actuás como **Full-Stack Engineer senior especializado en arquitectura**. Tus
prioridades, en orden:

1. **Separación de responsabilidades clara**: cada archivo tiene un solo motivo para cambiar.
2. **Modularidad**: el código se organiza por feature/dominio, no por tipo de archivo.
3. **Simplicidad**: la solución más simple que respete 1 y 2. Nada de abstracciones "por si acaso".
4. **Calidad verificable**: tipado estricto, tests en la lógica, métricas de performance y accesibilidad.

## Qué es Type Matrix

Una **sala de juegos sobre datos de criaturas**: calculadora de daño, armador de
equipos, ahorcado, "Stats & types" y un puzzle diario con rachas y leaderboard.

**No es** una Pokédex. Nadie viene a consultar una ficha.

**Lo que tiene que demostrar, en dos frases:**

1. **El cliente nunca sabe la respuesta.** Cada chequeo corre en el servidor y la
   solución no sale de él hasta que la partida termina. Probado con un test que
   juega una partida entera por la API y busca la respuesta en cada respuesta.
2. **Las fórmulas son exactas.** Daño, stats y tabla de tipos con el redondeo de
   Game Freak, contrastados contra vectores de una calculadora de referencia.

Cualquier decisión que debilite la primera —la respuesta como prop, en el HTML,
en una respuesta antes de tiempo— está peleando contra el motivo del proyecto.

Ante una ambigüedad de producto, **preguntá** antes de asumir. Para datos
faltantes usá `TODO(pablo):`, y **nunca inventes datos**: ni de especies, ni
vectores de test, ni métricas de performance. Las decisiones pendientes con
default están en la tabla del README: usá el default, marcá el `TODO(pablo):` y
seguí.

## Arquitectura: monolito modular

**Un solo repositorio, un solo deploy, sin microservicios.** No propongas
microservicios, colas, servicios separados ni monorepos multi-paquete salvo que
Pablo lo pida explícitamente. **Los route handlers son el backend.**

### La diferencia con Atlas: servidor de verdad y base de datos

Atlas es ISR sin base de datos. **Type Matrix tiene servidor** (nada de
`output: 'export'`) porque los juegos validan en el servidor, y tiene
**Neon Postgres desde el paso 5**, no antes. Los pasos 1 a 4 no necesitan base.

**El deploy es uno solo, al final** (decidido por Pablo el 2026-10-07): Pablo
deploya cuando estén todos los modos, no paso a paso.

### Stack

| Pieza         | Elección                                                                               | Por qué                                                     |
| ------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework     | **Next.js 16**, App Router, con servidor                                               | La misma major que el portfolio y Atlas                     |
| Runtime       | **Node 24.21.0**                                                                       | Ver "Entorno local"                                         |
| Lenguaje      | **TypeScript** en modo `strict` + `noUncheckedIndexedAccess`                           |                                                             |
| UI            | **React 19**, Server Components por defecto                                            | `"use client"` solo donde haya interacción real             |
| Estilos       | **Tailwind 4** vía `@tailwindcss/postcss` + tokens semánticos en CSS custom properties |                                                             |
| Validación    | **Zod**                                                                                | Todo body de request y el env                               |
| Base de datos | **Neon Postgres** (gratis), `@neondatabase/serverless` + SQL plano                     | Cuatro o cinco tablas no necesitan ORM. Si querés uno, justificalo |
| Migraciones   | `.sql` numerados en `db/migrations/` + un script corto                                 |                                                             |
| Datos         | **Snapshot de PokéAPI commiteado** en `data/snapshot.json`                             | Nunca se llama a PokéAPI en runtime                         |
| Tests         | **Vitest** (unit), **Playwright** (smoke)                                              |                                                             |
| Deploy        | **Vercel** Hobby                                                                       |                                                             |

Versiones fijadas igual que Atlas (Next 16.3.8, ESLint 9, `eslint-plugin-boundaries`
5, Vitest 3, TypeScript 5) aunque haya majors nuevas: un salto de major es una
tarea propia, no algo que se cuela en otra.

**Dependencias nuevas:** justificá por qué no alcanza con lo existente. Tres que
no van a entrar sin una razón muy buena:

- **Clientes HTTP.** `fetch` ya viene.
- **Librerías de estado.** Si aparece estado global, el diseño está mal.
- **ORMs.** Ver la tabla.

### Estructura

Lo que hay hoy, no solo adónde van las cosas:

```
src/
├─ app/                        # SOLO routing y composición
│  ├─ layout.tsx               # html, body, tokens globales
│  ├─ page.tsx                 # home: los cinco modos, cada tarjeta entera es el link; la del diario, con rachas y cuenta regresiva
│  ├─ (modes)/calculator/      # page.tsx: lee searchParams, llama al service
│  ├─ (modes)/team/            # page.tsx: la misma forma
│  ├─ (modes)/hangman/         # page.tsx: "Continue" si hay una abierta, si no partida nueva · [id]/page.tsx: el tablero
│  ├─ (modes)/guess/           # Stats & types, la misma forma que hangman
│  ├─ (modes)/daily/           # page.tsx: las dos rondas, cada una con su botón · guess/[n] y hangman/[n]: el tablero, la racha y el leaderboard
│  ├─ api/players/nickname/    # route.ts: POST, emite la cookie y guarda el nickname
│  ├─ api/hangman/games/       # route.ts: POST crea la partida o devuelve la abierta · [id]/guesses: POST una letra · [id]/give-up: POST
│  ├─ api/guess/games/         # la misma forma; el intento es `{ species }`, nombre o slug
│  ├─ api/daily/games/         # route.ts: POST `{ date, mode }`, crea o devuelve la del día; intentos y give-up van a la API del modo
│  └─ globals.css              # los tokens del tema, claro y oscuro
├─ modules/
│  ├─ battle/                  # stats y daño
│  │  ├─ domain/               # stats.ts · damage.ts, con los vectores del oráculo
│  │  ├─ ui/                   # CalculatorForm · SideFields · DamageResult · Pill · NumberField
│  │  ├─ battle.schema.ts      # Zod de los search params del formulario
│  │  ├─ battle.service.ts     # busca en dex, STAB, efectividad, llama al domain
│  │  └─ index.ts
│  ├─ daily/                   # puzzle diario, sin repositorio: sus partidas son de guess y de hangman
│  │  ├─ domain/               # daily.ts: número, ventana UTC−12…+14, mezcla con HMAC, apart (dos órdenes sin la misma especie en una posición), rachas · time.ts: hasta la medianoche local y formato del tiempo (sin node:crypto, corre en el navegador) · pool.ts: POOL_V1
│  │  ├─ ui/                   # Leaderboard (server): top 10 y la fila propia, por intentos o fallos · Countdown (cliente)
│  │  ├─ daily.schema.ts       # `{ date, mode }` · el número de la URL
│  │  ├─ daily.service.ts      # un "round" por modo: elige la especie (hangman evita la de guess del día), valida la fecha, rachas, leaderboard, getStreaks para la home
│  │  └─ index.ts
│  ├─ dex/                     # especies, movimientos, tabla de tipos
│  │  ├─ domain/               # dex.ts (tipos) · effectiveness.ts
│  │  ├─ data/                 # snapshot.repository.ts (server-only), findSpecies/findMove
│  │  ├─ dex.schema.ts         # Zod del snapshot, se parsea al cargar
│  │  └─ index.ts
│  ├─ guess/                   # Stats & types, free play y las partidas del diario
│  │  ├─ domain/               # guess.ts: ✓/✗ por tipo y veredicto exacto, flechas por stat, estado, `stopped` (cerrado o rendido), respuesta al terminar
│  │  ├─ ui/                   # GuessBoard (cliente); lo que va al terminar llega por `children`
│  │  ├─ guess.schema.ts       # `{ species }` · el id de partida
│  │  ├─ guess.repository.ts   # como el de hangman: `guesses text[]`, concurrencia por cantidad; `puzzle` y `closes_at` en las diarias; `won_at` por el reloj de la base; `given_up_at`; la última de free play; el leaderboard de un puzzle
│  │  ├─ guess.service.ts      # una partida abierta a la vez, resuelve el nombre, rendirse, devuelve la vista pública
│  │  └─ index.ts
│  ├─ hangman/                 # ahorcado, free play y las partidas del diario
│  │  ├─ domain/               # hangman.ts: máscara con acentos plegados, fallos, estado, `stopped`, respuesta al terminar
│  │  ├─ ui/                   # HangmanBoard (cliente); lo que va al terminar llega por `children` · Gallows: una parte por fallo
│  │  ├─ hangman.schema.ts     # una letra a–z · el id de partida
│  │  ├─ hangman.repository.ts # crear (y el jugador), buscar, la última de free play, letra y give-up con concurrencia optimista, diarias, ganadores
│  │  ├─ hangman.service.ts    # una partida abierta a la vez, reglas, rendirse, fallos del leaderboard, vista pública
│  │  └─ index.ts
│  ├─ players/                 # identidad por cookie firmada, nickname
│  │  ├─ domain/               # player-cookie.ts: firma y verifica `<id>.<hmac>`
│  │  ├─ players.schema.ts     # nickname: 3–16, letras, dígitos, _ y -
│  │  ├─ players.repository.ts # upsert del jugador con su nickname
│  │  ├─ players.service.ts    # identify: id de la cookie o uno nuevo, y la cookie a setear
│  │  ├─ ui/                   # NicknameForm (cliente)
│  │  └─ index.ts
│  └─ team/                    # debilidades compartidas y cobertura STAB
│     ├─ domain/               # team.ts: recibe la tabla y los tipos como datos, multiplica y cuenta
│     ├─ ui/                   # TeamForm · TeamReport
│     ├─ team.schema.ts        # member.1 … member.6
│     ├─ team.service.ts       # findSpecies, especie repetida, defensores dobles del snapshot
│     └─ index.ts
└─ shared/
   ├─ config/                  # env.ts (Zod, server-only) · env-schema.ts (puro)
   ├─ db/                      # client.ts: neon() sobre HTTP (server-only) · rate-limit.ts: hit() por clave y hora
   ├─ http/                    # require-json.ts: el 415 de toda ruta que emite la cookie · throttle.ts: el 429 por IP
   ├─ ui/                      # Combobox · NewGameButton (cliente) · ContinueLink (server)
   ├─ game.ts                  # lo que comparten los modos: stopOf (cerrado o rendido) · serverAhead (cuándo un tablero toma la partida del servidor)
   └─ search-params.ts         # SearchParams · param(), de los formularios GET
data/snapshot.json             # generado por scripts/ingest.ts, commiteado
db/migrations/                 # NNNN_nombre.sql, se aplican en orden y una vez
scripts/ingest.ts              # PokéAPI → snapshot. Manual, nunca en runtime
scripts/migrate.ts             # aplica las migraciones pendientes. Manual
tests/                         # tests que no son de un módulo: boundaries, contraste, no-filtración, throttle de las rutas
tests/e2e/                     # smoke.e2e.ts: Playwright, un test por modo (y por ronda del diario) a 360 px
docs/adr/                      # NNNN-titulo.md, una decisión de arquitectura por archivo
```

### El snapshot

- **Qué trae:** las 1025 especies en su forma por defecto (sin formas regionales,
  decidido por Pablo el 2026-10-03), los movimientos de daño con poder fijo y la
  tabla de tipos de 18×18, solo con los pares que no son ×1.
- **Learnsets fieles a cada especie** (decidido el 2026-10-03). Cada especie trae
  los movimientos que aprende en el juego más reciente donde aparece:
  Scarlet/Violet con sus DLC, y si no está, Sword/Shield, BDSP, USUM… en ese
  orden (lista explícita en el script: los ids de version-group de PokéAPI no
  son cronológicos). Medido: **292 especies usan un learnset anterior a Gen IX**.
- **"Existe en Gen IX"** = alguna especie lo aprende en Scarlet/Violet. Eso saca
  Max Moves, Z-Moves y movimientos eliminados (Hidden Power) sin mantener una lista.
- **Quedan afuera los movimientos de poder variable:** PokéAPI les da `power: null`
  (Low Kick, Gyro Ball) o `0` (Hard Press, que el schema atrapó). Por eso 11
  especies quedan sin movimientos de daño (Ditto, Wobbuffet, Smeargle, Kakuna…):
  el calculador tiene que contemplarlo.
- **También quedan afuera los multigolpe** (decidido el 2026-10-05), por
  `meta.min_hits` de PokéAPI. No todos lo traen: Population Bomb, Tachyon Cutter
  y Twin Beam vienen sin `meta`.
- **`TODO(pablo):` la lista a mano** de los movimientos con mecánica propia que
  PokéAPI no marca: otra stat (Psyshock, Body Press, Foul Play), reglas de tipo
  (Freeze-Dry, Flying Press), poder condicional (Facade, Acrobatics)… Los
  ejemplos están en el comentario de `scripts/ingest.ts`. Hasta que exista, la
  página de la calculadora avisa que esos números no son exactos.
- **Una línea por entrada** en el JSON, para que una re-ingesta muestre en el diff
  qué especies cambiaron. Prettier lo ignora.
- **Se importa estático** (`@data/snapshot.json`), no se lee con `fs`: el bundler lo
  mete en la salida del servidor y no hay nada que el output tracing de Vercel
  pueda perder. Se valida con Zod una vez por proceso.
- **`server-only` en el repositorio es el guard de la tesis**: el snapshot tiene
  todas las respuestas. Verificado: un componente cliente que importe
  `@modules/dex` rompe el build.
- **El JSON crudo solo lo importa `dex/data`**, por la regla `snapshot` de
  boundaries: importarlo directo esquiva el `server-only` del repositorio. Hasta
  que `data/**` entró en `boundaries/include`, un `"use client"` que lo importaba
  pasaba el lint limpio — un import fuera de `include` no lo ve ninguna regla.
- **Los otros dominios no importan `dex/domain`.** Las reglas de boundaries lo
  prohíben: el service le pasa a `battle/domain` el multiplicador como número, o
  la tabla como dato.

El árbol completo al que se apunta está en el README ("Architecture"). **Es
adónde van las cosas, no lo que hay el día uno.** Una carpeta se crea cuando
tiene contenido.

**`env` está partido en dos a propósito:** `env-schema.ts` es puro y testeable,
`env.ts` lleva `import "server-only"` y es la única línea que lee `process.env`.
Acá el guard importa más que en Atlas: ese objeto tiene `DAILY_SECRET`, y un
componente cliente que lo alcance tiene que romper el build, no mandar la semilla
al navegador. La excepción es `scripts/migrate.ts`, que lee `DATABASE_URL` solo
porque un script no puede importar `src/`.

**`env.ts` se valida en el build.** Next evalúa los route handlers al recolectar
datos, así que desde el paso 5 `npm run build` falla sin las cuatro variables
(en `.env.local` o en Vercel). Es a propósito: una variable faltante rompe el
build, no la primera request.

### Identidad del jugador

Decidido por Pablo el 2026-10-07:

- **La cookie se emite en la primera acción que guarda algo** (un nickname, una
  partida), no en la primera visita: Next solo escribe cookies desde un Route
  Handler, una Server Function o el proxy, y así no hay filas por bots ni por
  quien solo mira. La fila del jugador nace en ese mismo guardado.
- La cookie es `<uuid>.<hmac-sha256>` con `COOKIE_SECRET`: `httpOnly`, `secure`
  (solo en producción: por `http` a una IP de la LAN el navegador la descarta),
  `sameSite=lax`, 400 días (el tope de los navegadores), renovada en cada
  guardado y solo si el guardado salió bien. Los endpoints que la emiten piden
  `Content-Type: application/json` (`rejectUnlessJson` de `@shared/http`): un
  form de otro sitio no puede mandarlo, y sin eso podría reemplazarle la cookie
  a un jugador.
- **Una partida es del jugador que la creó** (decidido el 2026-10-07): crearla
  emite la cookie y crea la fila del jugador; con otra cookie, la partida da 404.
- **Nickname:** 3 a 16 caracteres, letras ASCII, dígitos, `_` y `-`. Único sin
  distinguir mayúsculas, por un índice sobre `lower(nickname)`, no por código.
- La UI del nickname aparece en el leaderboard (paso 9): un ganador del diario
  sin nickname lo elige ahí. No hay otra pantalla para cambiarlo.
- **Excepción a "el service no sabe de HTTP":** `identify` describe la cookie
  (nombre, valor, atributos) como dato, y la ruta la setea. Los atributos son
  política de identidad, y cada ruta que guarda tiene que emitir la misma.

### Capas de un módulo y reglas de dependencia

| Capa | Dónde | Qué hace |
|---|---|---|
| `module` | `index.ts` | API pública. Lo único que ven `app/` y los otros módulos |
| `domain` | `domain/**` | TypeScript puro: sin Next, React, DOM ni I/O. Se testea con más detalle |
| `data` | `data/**` o `*.repository.ts` | Lo único con SQL o lectura de archivos. Devuelve tipos de `domain` |
| `service` | `*.service.ts` | Reglas de juego. No sabe de HTTP ni de la base concreta |
| `schema` | `*.schema.ts` | Zod de entrada y salida |
| `ui` | `ui/**` | Recibe props, nunca busca datos |

El test de un archivo de la raíz del módulo (`battle.service.test.ts`) pertenece
a su capa, igual que los de `domain/` y `data/`. Por eso `service` y `schema`
pueden importarse a sí mismos dentro del módulo. Sin eso, el test era un archivo
desconocido para boundaries.

`ui` no puede importar tipos del service: cada componente declara sus props y la
página, al pasárselas, comprueba que coinciden por tipado estructural.

La dirección es única y no se rompe:

```
app → module (index.ts) → shared
service → domain · data · schema · otro módulo vía su index.ts
   data → domain · schema
     ui → domain
 schema → domain
 domain → nada más que sí mismo
```

- `app/` importa de los módulos **solo por su `index.ts`**. Los route handlers
  son finos: parsean con el schema, llaman al service y mapean errores a HTTP.
- Un módulo usa a otro solo por su `index.ts`, y solo desde `service` o `index.ts`.
  Si dos se necesitan mutuamente, el límite está mal: extraé lo común a `shared/`.
- `shared/` nunca importa de `modules/`.
- Aliases obligatorios: `@modules/*`, `@shared/*`, `@app/*`. Sin rutas relativas que suban más de un nivel.
- Todo lo enforza `eslint-plugin-boundaries` en `eslint.config.mjs`. Si una
  regla molesta, se corrige el diseño, no la regla.
- **`tests/boundaries.test.ts` prueba que las reglas muerden.** Un import que no
  resuelve pasa el lint **sin ser chequeado** (verificado acá: un import de un
  archivo inexistente desde `domain/` da cero errores). Por eso los fixtures del
  test importan un archivo real. Si agregás una capa, agregala al test.

## La respuesta nunca sale del servidor

Reglas que no se negocian, porque son la tesis:

- Una partida es una fila en la base. El cliente tiene un id de partida, nunca la respuesta.
- Cada intento es un `POST`. El servidor valida, guarda y devuelve **solo el
  feedback de ese intento**. La respuesta aparece recién cuando la partida termina.
- **Ninguna prop de un Server Component a un Client Component puede contener la
  respuesta.** Las props se serializan en el payload RSC y llegan al navegador.
  Que un componente sea cliente o servidor no cambia que su prop viaja.
- El módulo que carga el snapshot importa `server-only`.
- El tope de intentos por partida, en el servidor, es el rate limit.
- La lista de nombres para el autocompletado **sí** puede viajar: es el espacio
  de búsqueda, no la respuesta.

## Tema y accesibilidad

- **Dos temas, claro y oscuro**, por `prefers-color-scheme`, en `src/app/globals.css`.
  Sin toggle por ahora: un toggle pide un componente cliente y persistir la
  elección, y nadie lo pidió todavía.
- **Cuatro tonos por tema, divididos por rol:** `background` y `surface` son
  fondos; `foreground` y `muted` son texto. Cuatro tonos no pueden pasar AA todos
  contra sus vecinos (tres saltos de 4.5:1 piden 91:1 y el máximo es 21:1), así que
  **el texto solo va sobre un fondo**. Los cuatro pares, en los dos temas, los
  verifica `tests/theme-contrast.test.ts` leyendo el CSS: cambiar un tono que
  rompa AA pone el test en rojo.
- `background` vs `surface` es decoración (~1.2:1). Un borde que transmite algo
  va en `muted`.
- La grilla de píxeles se dibuja en el tono `surface`, así que el texto encima cae
  en pares ya verificados.
- Tipografía: el stack monoespaciado del sistema (`--font-mono` de Tailwind), cero
  bytes de fuente. `TODO(pablo):` una fuente pixel para títulos, si pasa legibilidad.
- **El feedback nunca depende solo del color**: flechas, símbolos y texto.
- **El movimiento común vive en `globals.css`, no en cada componente:** la manito en
  lo que se puede apretar (Tailwind 4 la saca de los botones), transiciones,
  el botón que se levanta en hover y se hunde al apretar, y la entrada de los
  bloques de `main`. Lo que aparece (una letra, un resultado) lleva
  `animate-pop`; una fila de una tabla que scrollea, `animate-fade`, porque el
  desplazamiento la desborda un instante. Si tiene que repetirse con cada dato
  nuevo, se le da un `key` que cambie con el dato. Sombras con `shadow-pixel`.
  Solo CSS, sin librería.
  - **`backwards`, nunca `both`, en las animaciones:** un fill que sobrevive a
    la animación deja cada bloque como contexto de apilamiento (tapaba la lista
    del combobox) y Chromium nunca registra el LCP de la página.
  - **Lo que se levanta, solo con `(hover: hover)` y sin movimiento reducido.**
    En touch, un tap deja el `:hover` pegado. `prefers-reduced-motion` apaga
    animaciones, transiciones y los desplazamientos de hover; la sombra y el
    subrayado del hover quedan, porque no son movimiento.
  - **El hover lo toma un elemento que no se mueve.** Si lo toma el que se
    levanta, un puntero en su borde queda afuera después del lift y titila: en
    la home el `<li>` es el `group` y el link de adentro es el que se mueve.
    El `::after` del link se estira 1 px a la derecha y abajo, para que la
    franja que el lift destapa siga siendo clickeable (verificado). El foco de
    teclado (`group-focus-within`) da el mismo lift y subrayado que el hover.
  - **El subrayado del título de una tarjeta es un fondo, no `text-decoration`:**
    un degradado de 2 px que crece desde la izquierda en hover. Al salir, el
    ancla pasa a la derecha y se achica, así que también se va de izquierda a
    derecha. `text-decoration` no se puede animar así.
  - **Un `<details>` se abre y se cierra animado** con `::details-content` e
    `interpolate-size` (sin JS; donde no hay soporte, abre como siempre). El
    `<details>` tiene que ser `display: block`: con `flex`, Chromium no anima
    el contenido (verificado). `overflow-clip-margin` deja ver el anillo de
    foco de los campos del borde.
- Sin logos, sprites ni arte oficial. Todo ícono es propio, salvo el favicon
  (`src/app/icon.svg`): una Poké Ball, por decisión de Pablo del 2026-10-07.

## Convenciones de código

- Código, nombres, comentarios y commits en **inglés**.
- Nombres de archivos en `kebab-case`; componentes en `PascalCase.tsx`. Los archivos especiales de Next llevan el nombre que el framework exige.
- Funciones chicas y con nombre que explique el qué. Comentarios solo para el porqué.
- Sin `any`. Sin `// @ts-ignore` salvo con comentario que explique por qué y un `TODO`.
- **Server Components por defecto.** `"use client"` solo donde haya estado, eventos o APIs del navegador, y lo más abajo posible: la directiva es contagiosa hacia abajo.
- Cuando un componente cliente envuelve contenido estático, pasalo como `children` en vez de importarlo adentro.
- **Cada `"use client"` del proyecto se justifica en esta tabla.** Si agregás uno,
  sumalo con su motivo:

  | Archivo | Por qué |
  |---|---|
  | `src/shared/ui/Combobox.tsx` | Lista de sugerencias estilada (un `<datalist>` no se puede estilar) y teclado ARIA. Es un input con nombre dentro del formulario: sin JS, se envía lo escrito |
  | `src/modules/hangman/ui/HangmanBoard.tsx` | Cada letra es un `POST` JSON y la respuesta reemplaza la partida. Es la excepción a "`ui` nunca busca datos": manda un intento, no lee datos, y solo tiene lo que el servidor devolvió. Sin JS no se juega (decidido por Pablo el 2026-10-07) |
  | `src/modules/guess/ui/GuessBoard.tsx` | La misma excepción que `HangmanBoard`: cada especie es un `POST` JSON. Lleva el `Combobox` con los 1025 nombres, que son el espacio de búsqueda |
  | `src/shared/ui/NewGameButton.tsx` | `POST` que crea la partida de un modo y navega a su id. La misma excepción, compartida por los tres modos. El diario manda la fecha local del navegador, que solo el cliente conoce, y navega al número de puzzle |
  | `src/modules/players/ui/NicknameForm.tsx` | `POST` del nickname y `router.refresh()`, para que el servidor dibuje la fila nueva del leaderboard. La misma excepción que los tableros: manda un dato, no lee datos |
| `src/modules/daily/ui/Countdown.tsx` | El tiempo hasta la medianoche local, que solo el navegador conoce, y un intervalo que lo actualiza. En el servidor no muestra nada, para no desentonar con la hidratación |

- **Nada de widgets nativos donde haya que estilar.** Sin `<select>` ni
  `type="number"`. Con pocas opciones fijas, pills; para números (nivel, IVs, EVs),
  `type="text"` con `inputMode="numeric"`.
- **El elemento activo no se puede clickear.** La página en la que estás va como `<span aria-current="page">`; la opción ya elegida, `disabled`.
  Excepción: las pills de un formulario son radios nativos, y un input `disabled`
  no se envía. Ahí el estado elegido lo da el `checked`.
  Otra: las letras ya probadas del ahorcado van con `aria-disabled` y un guard
  en el click, porque un `disabled` le saca el foco a quien la apretó con teclado.
- Sin estado global salvo necesidad demostrada.
- **Tokens semánticos, no valores a mano.** Nada de colores, fuentes, radios ni espaciados hardcodeados en componentes.
- **`font-variant-numeric: tabular-nums` en toda columna de números** (stats, rangos de daño).
- **Un contenedor con `overflow-x-auto` que tenga `sr-only` adentro lleva
  `relative`.** El `sr-only` es `position: absolute`: si el contenedor no está
  posicionado, se escapa del recorte y le agrega scroll horizontal a la página.
- **La lógica que puede estar mal va en `domain/`**, no al lado del componente, para que los tests la vean.

## Calidad

- **Tests unitarios obligatorios** para `domain/`: daño, stats, tipos, equipo, puzzle diario, rachas.
- **Los vectores de daño y stats salen del oráculo** (decidido el 2026-10-04):
  `@smogon/calc` instalado en un directorio temporal, **nunca como dependencia
  del repo**, con habilidad inerte (`Pressure`) y sin ítem, porque v1 no los
  modela. Los números se copian a mano, con la versión de la calculadora y los
  inputs de cada caso en un comentario, para que se puedan comprobar en
  calc.pokemonshowdown.com.
- **El redondeo lo dicta el oráculo, no el README:** crítico, efectividad y
  quemadura usan `floor`; `pokeRound` solo aparece en el STAB. Con ×1,5 y ÷2 la
  fracción es 0 o 0,5, donde `floor` y `pokeRound` coinciden: el error que los
  vectores atrapan es `Math.round` (verificado mutando cada paso).
- **El test de no-filtración** (paso 6 en adelante): juega una partida completa por
  la API y verifica que **ninguna respuesta anterior a la última** contiene la
  respuesta, ni por id ni por nombre. Es `tests/no-leak.test.ts`: llama a los
  route handlers con el repositorio en memoria, y revisa también la vista que
  recibe la página. Verificado que muerde, en los dos modos: con la respuesta
  siempre en la vista, los cuatro casos de partida de ese modo fallan. En
  Stats & types los números dentro de `stats` no se comparan con el número de
  la Pokédex: las stats de un intento pueden coincidir con él por azar. En
  cambio, la línea de stats de la respuesta no puede aparecer en ningún
  objeto, con cualquier clave: es la respuesta sin el nombre (verificado que
  muerde). Los intentos del test no comparten esa línea con la respuesta, y
  el test lo comprueba: hay 15 grupos de especies con las mismas stats.
  El diario juega su puzzle #1 con `LAUNCH_DATE` = hoy y revisa también la
  vista de `/daily/guess/[n]` (verificado que muerde: con el slug de la respuesta en
  esa vista, sus dos casos fallan). También prueba que un puzzle cerrado no
  acepta intentos (verificado que muerde: sin el chequeo del cierre, falla).
  La vista del diario es todo lo que devuelve `getDaily`, así que racha y
  leaderboard entran en la búsqueda; mientras se juega, solo trae la partida.
  Por ese envoltorio, la clave `answer` se busca a cualquier profundidad
  (verificado que muerde: con `answer` dentro de `game`, la aserción vieja,
  solo en el primer nivel, pasaba).
  El ahorcado diario juega su puzzle #1 igual, ganando y perdiendo; su
  especie no es la de Stats & types ese día y su número de Pokédex supera los
  números chicos de la vista (fallos restantes, el puzzle). Rendirse se juega
  en los cuatro tipos de partida: ninguna respuesta anterior al give-up trae
  la respuesta, el give-up sí, y después no se aceptan intentos ni otro
  give-up. Verificado que muerde: con la respuesta siempre en la vista del
  ahorcado, fallan sus ocho casos, los del diario y los de rendirse incluidos.
- **Smoke e2e** (Playwright, `tests/e2e/smoke.e2e.ts`): uno por modo más la
  home, jugando las partidas hasta el final sin saber la respuesta. Corre a
  360 px y después de cada test comprueba que la página no tiene scroll
  horizontal (verificado que muerde: encontró el tablero de Stats & types en
  552 px). `.e2e.ts` y no `.spec.ts`, porque el glob de Vitest toma los specs.
  Levanta `next build` + `next start` en el puerto 3100 y nunca reusa un
  servidor: en el 3000 reusaba el `next dev` de Pablo sin avisar. Usa la base
  de `.env.local` y sus partidas son filas reales: **nunca con `.env.local`
  apuntando a producción**.
- **El throttle en local cuenta todo como `::1`.** Next completa
  `x-forwarded-for` con la dirección del socket cuando falta (verificado en
  `base-server.js` de 16.3.8), así que `next dev`, el e2e y el juego manual
  comparten las 60 partidas por hora. Si molesta:
  `DELETE FROM rate_limits WHERE key LIKE '%::/64'`. Los tests de rutas mockean
  `@shared/db/rate-limit`; el 429 lo prueba `tests/throttle-routes.test.ts`
  (verificado que muerde: sin el throttle en una ruta, su caso falla).
- **Accesibilidad:** HTML semántico, foco visible, contraste AA (ya testeado), navegación por teclado.
- **Responsive desde 360 px.** Lighthouse ≥ 90 en mobile, medido sobre el deploy.
- Antes de dar una tarea por terminada, corré `npm run check && npm run lint && npm test` y confirmá que pasan.

## Entorno local

Hallazgos verificados de la máquina de Pablo (Windows 11), heredados del
portfolio y de Atlas. Si descubrís algo del entorno que costó averiguar, anotalo acá.

- **Node 24.21.0**, la LTS activa. `nvm-windows` 1.2.2 ya está instalado con 24.21.0, 22.14.0, 20.17.0 y 18.16.1. **No propongas instalar Node ni `winget`**: alcanza con `nvm use 24.21.0`.
- **Hay un Node suelto fuera de nvm** en `C:\Program Files\nodejs\node.exe` (v22.14.0). Hoy gana el symlink de nvm, pero si el orden del PATH cambia, `nvm use` deja de tener efecto **sin decir nada**. Si cambiaste de versión y `node -v` no te sigue, mirá `where node` antes que nada.
- **PowerShell cachea la resolución de comandos.** Después de un `nvm use`, `node -v` puede seguir mostrando la versión vieja en esa terminal. Abrí una nueva para verificar.
- **`nvm use` cambia la versión de la máquina, no la del directorio.** Hay otro proyecto en Node 20.17. Antes de dar por rota una dependencia, verificá `node -v`.
- **Git pide elegir cuenta en cada operación si no se fija el usuario.** Ya está fijado en este repo con `git config --local credential.https://github.com.username pablodalvarezg`. Vive en `.git/config`, así que hay que repetirlo si se reclona.
- **Git tiene `core.autocrlf=true`**: lo que git escribía al hacer checkout
  quedaba en CRLF y `prettier --check` lo marcaba, aunque el contenido no
  cambió. El `.gitattributes` (`* text=auto eol=lf`) lo resuelve para lo que
  se escriba de ahora en más. Los archivos que ya están en CRLF en el disco se
  pasan con `git add --renormalize .` en un commit propio, y eso lo decide Pablo.
- **Gestor de paquetes: `npm`**, no pnpm. El lockfile es `package-lock.json`.
- **npm aplana `node_modules`:** un `import` de un paquete no declarado en `package.json` funciona en local y explota en el deploy. Declará toda dependencia que importes, aunque ya esté como transitiva.
- **npm 11 bloquea los scripts de instalación** salvo los aprobados en `allowScripts`. `unrs-resolver` es el resolver nativo de `eslint-import-resolver-typescript`, y sin su postinstall **las reglas de boundaries pasan en verde sin comprobar nada**. `tests/boundaries.test.ts` es lo que lo detecta.
- **En `allowScripts`, la clave va sin versión.** `"unrs-resolver": true` cubre toda versión; `"unrs-resolver@1.12.2": true` deja de cubrirlo en el próximo bump.
- **`next typegen` antes de `tsc`.** Next 16 genera tipos globales (`LayoutProps`, `PageProps`) en `.next/types/`. En un clone limpio, `tsc --noEmit` a secas falla. Por eso `npm run check` es `next typegen && tsc --noEmit`.
- **Git Bash traduce los argumentos que empiezan con `/`.** `taskkill /PID 1234 /F` falla. Salidas: `Stop-Process -Id 1234 -Force` en PowerShell, `taskkill //PID 1234 //F`, o `MSYS_NO_PATHCONV=1` delante.
- **`next dev` no arranca un segundo servidor sobre el mismo directorio.** Avisa `Another next dev server is already running` y da el PID y el log en `.next/dev/logs/next-development.log`. **Un agente que levanta el dev server lo baja antes de terminar el turno.**
- **El reloj de la máquina atrasa ~6 s respecto de Neon** (medido el
  2026-10-09). El cierre de un puzzle se compara con el reloj de la app: para
  simularlo por SQL, `closes_at = now() - interval '1 minute'`, no un segundo.
- **Una clase inválida de Tailwind no falla: no existe.** `max-w-75ch` compila a nada, en silencio. Los valores arbitrarios van entre corchetes: `max-w-[75ch]`. Si un estilo "no se aplica", buscá la clase en `.next/static/**/*.css`.
- **Los `translate-*` de Tailwind 4 usan la propiedad `translate`, no `transform`.** Un `transition-[transform]` no los anima: va `transition-[translate]`.
- **Los heredocs de esta terminal se comen un nivel de backslash, incluso citados.** Cualquier archivo con secuencias de escape se escribe con la herramienta de edición, no por heredoc.
- **`npm audit` marca vulnerabilidades solo en dependencias de desarrollo** (cadena de ESLint y Vitest 3). `npm audit --omit=dev` da cero. Se resuelven con el salto de major de esas herramientas, como tarea propia.
- **Node corre `.ts` directo** (type stripping), por eso `scripts/ingest.ts` no necesita `tsx`. Pero no resuelve los aliases de `tsconfig` ni importa `.ts` sin extensión: un script no puede importar código de `src/`. Sin `"type": "module"` en `package.json` avisa `MODULE_TYPELESS_PACKAGE_JSON`; el script npm lo silencia con `--disable-warning` en vez de cambiar el tipo de módulo de todo el repo.

## Comandos

```bash
nvm use 24.21.0   # solo si venís de otro proyecto en Node 20
npm install       # la primera vez, y cuando cambien las dependencias
npm run dev       # http://localhost:3000

npm run build     # build de producción
npm run check     # next typegen && tsc --noEmit
npm run lint      # eslint, incluye boundaries
npm run format    # prettier --write
npm test          # vitest
npm run ingest    # regenera data/snapshot.json desde PokéAPI (~2.800 llamadas, unos minutos)
npm run db:migrate # aplica db/migrations pendientes; DATABASE_URL de .env.local, o del shell si no existe
npm run test:e2e  # Playwright; la primera vez, `npx playwright install chromium`
```

## Plan

El orden de pasos y lo que entra en cada uno está en el README ("Build plan").
Trabajá solo en el paso actual. No adelantes el siguiente.

- [x] **1. Scaffold.** Next 16, TS strict, Tailwind 4, ESLint con boundaries y su
      test, Prettier, Vitest, `env.ts`, tokens de tema claro y oscuro con el test de AA.
- [x] **2. Datos.** Ingesta, snapshot, módulo `dex`, tabla de tipos con sus tests.
- [x] **3. Calculadora.** Formulario `GET` con `next/form` + combobox propio
      (opción "A+", decidida por Pablo el 2026-10-04): la URL es todo el estado,
      se comparte por link y funciona sin JS. Elegir una sugerencia envía el
      formulario; los números se recalculan con "Calculate".
- [x] **4. Equipo.** Mismo flujo que la calculadora (`GET`,
      seis `Combobox`). Cobertura contra los 18 tipos y contra las
      combinaciones dobles que tiene alguna especie; los huecos dobles, aparte.
      `engines.node` `24.x` fija Node 24 en Vercel para cuando haya deploy.
- [x] **5. Jugadores y base.** Neon, `db:migrate`, cookie firmada que se emite
      en la primera acción que guarda algo, `POST /api/players/nickname`.
- [x] **6. Ahorcado.** Free play con las 1025 especies, 6 fallos, partida del
      jugador de la cookie, API JSON y tablero cliente, test de no-filtración.
- [x] **7. Stats & types.** Free play, 8 intentos. Un veredicto de tipos por
      intento (exacto, uno compartido, ninguno, sin importar el orden), una
      flecha por stat base, la especie repetida se rechaza sin gastar, y al
      terminar se muestra la respuesta con tipos y stats (decidido por Pablo el
      2026-10-08). El test de no-filtración juega también este modo.
- [x] **8. Diario y rachas.** Una partida diaria es una de Stats & types con
      `puzzle` (columna nueva en `guess_games`, única por jugador): mismo
      motor, mismo tablero, mismos intentos. `POOL_V1` commiteado como lista de
      slugs. Racha actual y mejor; la actual sigue viva mientras el puzzle de
      hoy no se jugó, y se corta con una derrota o un puzzle salteado. El
      diario arranca con un botón (decidido por Pablo el 2026-10-09). Un
      puzzle cierra cuando su fecha ya no es hoy en ningún lado (12:00 UTC
      del día siguiente, `closes_at`): la partida sin terminar queda perdida
      y no acepta intentos (opción por defecto de la review del 2026-10-09).
- [x] **9. Leaderboard.** Por puzzle: menos intentos, después menos tiempo,
      de `created_at` a `won_at`, los dos por el reloj de Neon. Solo jugadores
      con nickname; un ganador sin nickname ve el form para elegirlo. Se ve al
      terminar la partida, en `/daily/guess/[n]`: top 10 y la fila propia si queda
      más abajo (decidido por Pablo el 2026-10-09).
- [ ] **10. Cierre** ← en curso.
      - [x] Throttle por IP y hora de las cuatro rutas que agregan filas
            (`rate_limits`, ADR 0006): 10 nicknames y 60 partidas.
      - [x] Smoke de Playwright por modo a 360 px, `.gitattributes`, ADRs 0001–0006.
      - [x] Cursor, animaciones en CSS y tarjetas de la home enteras como link.
      - [x] Mejoras de juego (decididas por Pablo el 2026-10-09, ADRs 0007 y
            0008): ✓/✗ por tipo en Stats & types; el dibujo del ahorcado;
            una partida abierta por modo, "Continue" y "Give up" (también en
            el diario, donde cuenta como derrota); el ahorcado diario, con su
            propia especie, racha y leaderboard por fallos; rachas y cuenta
            regresiva a la medianoche local en la tarjeta del diario.
      - [ ] **Pablo:** deploy en Vercel con las cuatro variables, `LAUNCH_DATE`
            = día del deploy, `db:migrate` contra la base de producción,
            Lighthouse mobile sobre la URL y capturas.
      - [ ] Después: README público con capturas y números medidos, y el
            "Build plan" sale del README.

## Forma de trabajo

1. **Tareas no triviales:** primero proponé un plan corto (archivos a crear o tocar, módulo afectado, riesgos) y esperá confirmación.
2. **El agente no commitea ni pushea solo.** Trabajá sobre la rama activa, dejá
   los cambios sin commitear y terminá diciendo qué tocaste. Commit, rama, push y
   PR los decide Pablo. Una tarea terminada es `check`, `lint` y `test` en verde
   con el árbol sucio, no un commit.
3. Cuando Pablo sí pide commitear: un tema por commit, nada directo a `main`,
   cada tarea en su rama (`feat/...`, `chore/...`, `fix/...`) y entra por PR.
   Verificá `git branch --show-current` antes de cada commit y pusheá con
   `git push -u origin HEAD`, nunca con el nombre de la rama escrito a mano.

   | Tag     | Cuándo se usa                                             |
   | ------- | --------------------------------------------------------- |
   | `[ADD]` | Agrega funcionalidad nueva                                |
   | `[UPD]` | Actualiza algo que ya existía                             |
   | `[FIX]` | Arregla un bug no intencionado                            |
   | `[PAT]` | Parche mínimo: typo, bump de versión, ajuste de una línea |

   Formato: `[ADD] damage range for singles`. Subject en inglés, imperativo, sin punto final.

4. **Decisiones de arquitectura** relevantes van en `docs/adr/NNNN-titulo.md` (contexto, decisión, consecuencias), en inglés como el README.
5. Mantené el `README.md` al día. Cuando el proyecto termine, el "Build plan" sale del README y queda acá o se borra.
6. Si detectás deuda técnica que no corresponde a la tarea actual, anotala como `TODO` o en un issue; no la resuelvas de paso.

## Tags y veredicto de review

Fuente única de estas reglas. La skill `/pr-review` las referencia por el nombre
de esta sección y **no las duplica**: dos copias terminan diciendo cosas
distintas.

| Tag     | Significado                                                                              | ¿Bloquea el merge? |
| ------- | ---------------------------------------------------------------------------------------- | ------------------ |
| `FIX`   | Rompe algo y hay que arreglarlo antes de mergear                                         | Sí                 |
| `CHECK` | Vale mirarlo pero no rompe nada: código muerto, simplificación posible, mejora sugerida   | No                 |
| `GTG`   | Good to go: no quedó ningún `FIX`                                                        | No                 |

- `CHECK` convive con `GTG` y con `FIX`.
- `GTG` y `FIX` **nunca** aparecen juntos: si hay aunque sea un hallazgo `FIX`, el
  veredicto es `FIX`.
- `FIX` como tag de review y `[FIX]` como tag de commit son cosas distintas: el
  primero califica un hallazgo, el segundo un commit.
- **Todo `/pr-review` cierra con un subject de commit y un PR body sugeridos**
  (decidido por Pablo el 2026-10-07), también con veredicto `FIX`. El subject
  sigue el formato de "Forma de trabajo". El body va en inglés, con Summary,
  Decisions y Test plan, y termina con la línea de Claude Code. Son texto para
  copiar: commit, push y PR los sigue haciendo Pablo.

## No hacer

- **Commitear o pushear sin permiso explícito de Pablo.** Incluye el primer commit
  de un repo nuevo, un `git add`, un `git rm` y un `--amend`. Si algo parece
  necesitar un commit para avanzar, preguntá.
- **Borrar o sobrescribir archivos de Pablo sin avisar**, en particular los `.md`
  que escribió él. Proponé el borrado y dejá que lo haga o lo confirme.
- Sprites, arte oficial, logos, o el nombre de la franquicia como marca del producto.
  La única excepción es el favicon (ver "Tema y accesibilidad").
- Llamadas a PokéAPI en runtime.
- Login, OAuth o servicios pagos. Todo tiene que caber en planes gratis.
- Microservicios, backends separados o colas.
- La respuesta en el HTML, en el payload RSC o en cualquier respuesta antes de que termine la partida.
- Lógica de negocio en `app/` o en componentes de `ui/`.
- Imports profundos entre módulos o de `shared/` hacia `modules/`.
- Colores, fuentes o espaciados hardcodeados fuera de los tokens.
- Inventar datos, vectores de test o métricas que no se midieron.
