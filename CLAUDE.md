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
**Neon Postgres desde el paso 5**, no antes. Los pasos 1 a 4 no necesitan base y
tienen que poder deployarse sin ella.

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
│  ├─ page.tsx                 # home: los cinco modos, "coming soon"
│  └─ globals.css              # los tokens del tema, claro y oscuro
├─ modules/                    # vacío: cada módulo nace con su paso del plan
└─ shared/
   └─ config/                  # env.ts (Zod, server-only) · env-schema.ts (puro)
tests/                         # tests que no son de un módulo: boundaries, contraste
```

El árbol completo al que se apunta está en el README ("Architecture"). **Es
adónde van las cosas, no lo que hay el día uno.** Una carpeta se crea cuando
tiene contenido.

**`env` está partido en dos a propósito:** `env-schema.ts` es puro y testeable,
`env.ts` lleva `import "server-only"` y es la única línea que lee `process.env`.
Acá el guard importa más que en Atlas: ese objeto tiene `DAILY_SECRET`, y un
componente cliente que lo alcance tiene que romper el build, no mandar la semilla
al navegador.

### Capas de un módulo y reglas de dependencia

| Capa | Dónde | Qué hace |
|---|---|---|
| `module` | `index.ts` | API pública. Lo único que ven `app/` y los otros módulos |
| `domain` | `domain/**` | TypeScript puro: sin Next, React, DOM ni I/O. Se testea con más detalle |
| `data` | `data/**` o `*.repository.ts` | Lo único con SQL o lectura de archivos. Devuelve tipos de `domain` |
| `service` | `*.service.ts` | Reglas de juego. No sabe de HTTP ni de la base concreta |
| `schema` | `*.schema.ts` | Zod de entrada y salida |
| `ui` | `ui/**` | Recibe props, nunca busca datos |

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
- Sin logos, sprites ni arte oficial. Todo ícono es propio.

## Convenciones de código

- Código, nombres, comentarios y commits en **inglés**.
- Nombres de archivos en `kebab-case`; componentes en `PascalCase.tsx`. Los archivos especiales de Next llevan el nombre que el framework exige.
- Funciones chicas y con nombre que explique el qué. Comentarios solo para el porqué.
- Sin `any`. Sin `// @ts-ignore` salvo con comentario que explique por qué y un `TODO`.
- **Server Components por defecto.** `"use client"` solo donde haya estado, eventos o APIs del navegador, y lo más abajo posible: la directiva es contagiosa hacia abajo.
- Cuando un componente cliente envuelve contenido estático, pasalo como `children` en vez de importarlo adentro.
- **Cada `"use client"` del proyecto se justifica en esta tabla.** Si agregás uno,
  sumalo con su motivo. Hoy no hay ninguno:

  | Archivo | Por qué |
  |---|---|

- **Nada de widgets nativos donde haya que estilar.** Sin `<select>` ni
  `type="number"`. Con pocas opciones fijas, pills; para números (nivel, IVs, EVs),
  `type="text"` con `inputMode="numeric"`.
- **El elemento activo no se puede clickear.** La página en la que estás va como `<span aria-current="page">`; la opción ya elegida, `disabled`.
- Sin estado global salvo necesidad demostrada.
- **Tokens semánticos, no valores a mano.** Nada de colores, fuentes, radios ni espaciados hardcodeados en componentes.
- **`font-variant-numeric: tabular-nums` en toda columna de números** (stats, rangos de daño).
- **La lógica que puede estar mal va en `domain/`**, no al lado del componente, para que los tests la vean.

## Calidad

- **Tests unitarios obligatorios** para `domain/`: daño, stats, tipos, equipo, puzzle diario, rachas.
- **El test de no-filtración** (paso 6 en adelante): juega una partida completa por
  la API y verifica que **ninguna respuesta anterior a la última** contiene la
  respuesta, ni por id ni por nombre.
- **Smoke e2e** (Playwright): uno por modo.
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
- **Gestor de paquetes: `npm`**, no pnpm. El lockfile es `package-lock.json`.
- **npm aplana `node_modules`:** un `import` de un paquete no declarado en `package.json` funciona en local y explota en el deploy. Declará toda dependencia que importes, aunque ya esté como transitiva.
- **npm 11 bloquea los scripts de instalación** salvo los aprobados en `allowScripts`. `unrs-resolver` es el resolver nativo de `eslint-import-resolver-typescript`, y sin su postinstall **las reglas de boundaries pasan en verde sin comprobar nada**. `tests/boundaries.test.ts` es lo que lo detecta.
- **En `allowScripts`, la clave va sin versión.** `"unrs-resolver": true` cubre toda versión; `"unrs-resolver@1.12.2": true` deja de cubrirlo en el próximo bump.
- **`next typegen` antes de `tsc`.** Next 16 genera tipos globales (`LayoutProps`, `PageProps`) en `.next/types/`. En un clone limpio, `tsc --noEmit` a secas falla. Por eso `npm run check` es `next typegen && tsc --noEmit`.
- **Git Bash traduce los argumentos que empiezan con `/`.** `taskkill /PID 1234 /F` falla. Salidas: `Stop-Process -Id 1234 -Force` en PowerShell, `taskkill //PID 1234 //F`, o `MSYS_NO_PATHCONV=1` delante.
- **`next dev` no arranca un segundo servidor sobre el mismo directorio.** Avisa `Another next dev server is already running` y da el PID y el log en `.next/dev/logs/next-development.log`. **Un agente que levanta el dev server lo baja antes de terminar el turno.**
- **Una clase inválida de Tailwind no falla: no existe.** `max-w-75ch` compila a nada, en silencio. Los valores arbitrarios van entre corchetes: `max-w-[75ch]`. Si un estilo "no se aplica", buscá la clase en `.next/static/**/*.css`.
- **Los heredocs de esta terminal se comen un nivel de backslash, incluso citados.** Cualquier archivo con secuencias de escape se escribe con la herramienta de edición, no por heredoc.
- **`npm audit` marca vulnerabilidades solo en dependencias de desarrollo** (cadena de ESLint y Vitest 3). `npm audit --omit=dev` da cero. Se resuelven con el salto de major de esas herramientas, como tarea propia.

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
```

Los que llegan con su paso del plan: `npm run ingest` (2), `npm run db:migrate` (5),
`npm run test:e2e` (10).

## Plan

El orden de pasos y lo que entra en cada uno está en el README ("Build plan").
Trabajá solo en el paso actual. No adelantes el siguiente.

- [x] **1. Scaffold.** Next 16, TS strict, Tailwind 4, ESLint con boundaries y su
      test, Prettier, Vitest, `env.ts`, tokens de tema claro y oscuro con el test de AA.
- [ ] **2. Datos.** ← siguiente
- [ ] 3. Calculadora · 4. Equipo + **primer deploy** · 5. Jugadores y base ·
      6. Ahorcado · 7. Stats & types · 8. Diario y rachas · 9. Leaderboard · 10. Cierre

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

## No hacer

- **Commitear o pushear sin permiso explícito de Pablo.** Incluye el primer commit
  de un repo nuevo, un `git add`, un `git rm` y un `--amend`. Si algo parece
  necesitar un commit para avanzar, preguntá.
- **Borrar o sobrescribir archivos de Pablo sin avisar**, en particular los `.md`
  que escribió él. Proponé el borrado y dejá que lo haga o lo confirme.
- Sprites, arte oficial, logos, o el nombre de la franquicia como marca del producto.
- Llamadas a PokéAPI en runtime.
- Login, OAuth o servicios pagos. Todo tiene que caber en planes gratis.
- Microservicios, backends separados o colas.
- La respuesta en el HTML, en el payload RSC o en cualquier respuesta antes de que termine la partida.
- Lógica de negocio en `app/` o en componentes de `ui/`.
- Imports profundos entre módulos o de `shared/` hacia `modules/`.
- Colores, fuentes o espaciados hardcodeados fuera de los tokens.
- Inventar datos, vectores de test o métricas que no se midieron.
