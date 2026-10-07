# Paso 4: armador de equipos y primer deploy

Brief para un agente que arranca sin contexto. Está pensado para que no tengas
que releer el repo entero: leé solo lo que lista "Leer antes" y seguí este
archivo. Las reglas de `CLAUDE.md` siguen valiendo todas; acá van las que más
pesan en este paso.

## Leer antes (y nada más, salvo que haga falta)

1. `CLAUDE.md`: el archivo entero.
2. `README.md`: solo "5. Team analysis" y el paso 4 de "Build plan".
3. El calculador como patrón a copiar. Este paso es el mismo flujo con otro dominio:
   - `src/modules/battle/battle.schema.ts`: search params con Zod, `param()`, errores por campo;
   - `src/modules/battle/battle.service.ts`: busca en `dex`, arma la vista, llama al domain;
   - `src/modules/battle/ui/CalculatorForm.tsx`: `next/form` GET más `Combobox`;
   - `src/app/(modes)/calculator/page.tsx`: página fina.
4. `src/modules/dex/index.ts`: `findSpecies`, `snapshot.typeChart`, `TYPE_NAMES`, `effectiveness`.
5. `eslint.config.mjs`: las capas y quién importa a quién.

**No hace falta leer:** `data/snapshot.json` (son 574 KB; si necesitás un dato,
usá `findSpecies` en un test o un `grep` puntual), `scripts/ingest.ts` ni los
tests del calculador.

## Qué se construye

### `src/modules/team/`

- **`domain/`**: TypeScript puro y la parte más testeada.
  - **Debilidades compartidas:** para cada uno de los 18 tipos atacantes, cuántos
    miembros reciben ×2 o más, y cuántos resisten (<×1) o son inmunes (×0).
  - **Aviso:** se dispara con dos o más miembros débiles a un tipo y ninguno que
    lo resista o sea inmune.
  - **Cobertura ofensiva (v1):** el mejor multiplicador que logran los **tipos
    STAB** del equipo contra cada defensor. Sin movimientos todavía.
  - **Qué defensores cuenta la cobertura:**
    - los 18 tipos simples;
    - las combinaciones de dos tipos que **tiene alguna especie del snapshot**.

    Se sacan del snapshot y no de una lista a mano. Sin duplicados: Fire/Flying y
    Flying/Fire son el mismo defensor, porque la efectividad es un producto.
    Esto va más allá del README, que solo habla de tipos simples: actualizá la
    sección "5. Team analysis".
- **`team.schema.ts`**: los search params del formulario.
- **`team.service.ts`**: resuelve los nombres con `findSpecies`, le pasa al
  domain los tipos y la tabla **como datos**, y arma la vista.
- **`ui/`**: el formulario y los resultados:
  - la tabla de debilidades, con los 18 tipos atacantes;
  - la tabla de cobertura contra los 18 tipos simples;
  - la lista de **huecos dobles**: las combinaciones de dos tipos contra las que
    el mejor STAB del equipo no pasa de ×1.

  Si no hay huecos, se dice con texto.
- **`index.ts`**.

### Lo demás

- **`src/app/(modes)/team/page.tsx`**: la misma forma que la página del calculador.
- **`src/app/page.tsx`**: el modo "Team builder" pasa a tener `href: "/team"`.
- **`tests/boundaries.test.ts`**: hace falta tocarlo solo si aparece una capa
  nueva. No debería aparecer ninguna.
- **Docs:** el árbol de "Estructura" en `CLAUDE.md` y el plan (paso 4 `[x]`,
  paso 5 `← siguiente`).

## Restricciones que muerden en este paso

- **`team/domain` no puede importar `dex/domain`**: lo prohíbe boundaries. El
  domain declara sus propios tipos de forma estructural, por ejemplo
  `Record<string, Partial<Record<string, number>>>` para la tabla, y recibe la
  lista de tipos atacantes como argumento.
- **La lógica de multiplicadores ya existe.** `effectiveness` vive en
  `dex/domain`, y desde `team/domain` no se puede importar. Hay dos opciones:
  1. el service calcula la matriz de multiplicadores con `effectiveness` y el
     domain solo cuenta;
  2. el domain recibe la tabla y multiplica él mismo.

  Elegí la que deje el domain más simple y explicá la elección en una línea.
- **`ui` no importa tipos del service**: las props se declaran de forma
  estructural.
- **Sin `"use client"` nuevos.** `Combobox` ya existe en `shared/ui`; se usa seis
  veces.
- **Sin `<select>` ni `type="number"`.** Los números van en columnas con
  `tabular-nums`, con tokens y sin colores a mano.
- **El feedback no depende solo del color**: el aviso lleva texto o un símbolo.
- **Tests:** todo número esperado sale de la tabla de tipos real y se puede
  comprobar a mano. Un comentario por caso dice de dónde sale, por ejemplo
  "Fire→Grass ×2 en el snapshot". Casos mínimos:
  - tipo doble que se cancela (×1);
  - inmunidad que tapa una debilidad (Ground contra Flying/Steel = ×0);
  - ×4;
  - equipo vacío o parcial;
  - aviso sí y aviso no;
  - cobertura con dos STAB que se complementan;
  - un defensor doble que es hueco aunque sus dos tipos, por separado, no lo sean;
  - una especie repetida da error.

  Además, un test del service con especies reales.

## Primer deploy

El agente **prepara** el deploy y **no lo ejecuta**: crear el proyecto en Vercel
y conectar el repo es una acción externa que hace Pablo.

- **Verificado:** `src/shared/config/env.ts` no lo importa nadie hoy, así que el
  build no pide variables de entorno. Comprobalo: `npm run build` con
  `.env.local` ausente o renombrado. Si algo lo importa, el paso 4 no se puede
  deployar sin base, y eso es un problema que hay que avisar.
- **Fijar Node 24 para Vercel:** `engines.node` en `package.json`, o el ajuste
  del proyecto en Vercel. Leé la doc de Vercel antes de elegir y no inventes la
  sintaxis.
- **Dejar escrito para Pablo**, en el mensaje final y no en el repo, los pasos:
  importar el repo, framework Next, sin variables de entorno por ahora.
- **Después del deploy**, la URL va al README. Eso lo hace Pablo, o el agente
  cuando Pablo le pase la URL.
- **Sin métricas inventadas:** Lighthouse se mide en el paso 10.

## Decisiones de producto (Pablo, 2026-10-07)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Se puede repetir una especie en el mismo equipo? | No, como la Species Clause. La repetida da error en su campo y no hay resultado |
| 2 | ¿Se analiza un equipo de menos de 6? | Sí, con los miembros que haya. Sin miembros, no se muestra resultado |
| 3 | ¿Cómo se llaman los params? | `member.1` … `member.6` |
| 4 | ¿La cobertura contempla defensores de tipo doble? | Sí: las combinaciones que existen en el snapshot. Los huecos se listan aparte |

Si aparece otra ambigüedad de producto, preguntá antes de asumir.

## Cerrar la tarea

- `npm run check && npm run lint && npm test` en verde, y `npm run build` en verde.
- Árbol sucio, **sin commits ni `git add`**.
- Mensaje final con:
  - los archivos tocados;
  - las decisiones de la tabla que se usaron por default;
  - los pasos de Vercel para Pablo;
  - lo que no se verificó: por ejemplo, la interacción en un navegador real.
