import "server-only";

import raw from "@data/snapshot.json";
import { parseSnapshot } from "@modules/dex/dex.schema";

/*
 * `server-only` is the leak guard, not a formality: this object holds every
 * species, so it holds every game's answer. A client component that reaches
 * it fails the build instead of shipping the answer key.
 *
 * A static import rather than a file read: the bundler carries the JSON into
 * the server output, so there is no runtime path to resolve and nothing for
 * output tracing to miss on Vercel. Parsed once per server process.
 */
export const snapshot = parseSnapshot(raw);
