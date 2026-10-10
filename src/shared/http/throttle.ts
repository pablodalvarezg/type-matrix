import { hit } from "@shared/db/rate-limit";

/** Hourly caps per IP, generous enough for a shared connection. */
export const LIMITS = { nickname: 10, games: 60 } as const;

/**
 * A 429 once the caller's IP has made more than its bucket's hourly cap of
 * requests. For the routes that add rows: without it, a script that drops its
 * cookie makes a new player on every call.
 *
 * Next fills x-forwarded-for with the socket's address when it is missing
 * (so `next dev` counts everything as ::1), and Vercel overwrites it with the
 * client's, so it cannot be spoofed there.
 * ponytail: per IP, so a NAT shares one cap; a cookie-less bucket per player
 * would not stop the scripts this is for.
 */
export async function throttle(
  request: Request,
  bucket: keyof typeof LIMITS,
): Promise<Response | undefined> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if ((await hit(`${bucket}:${clientKey(ip ?? "")}`)) <= LIMITS[bucket]) {
    return undefined;
  }
  return Response.json(
    { error: "Too many requests. Try again in an hour." },
    { status: 429 },
  );
}

/**
 * IPv4 as is; IPv6 by its /64, the block one subscriber gets, or a script
 * could rotate addresses inside it and start a fresh count on every call.
 */
function clientKey(ip: string): string {
  if (!ip.includes(":") || ip.includes(".")) return ip; // v4, or v4-mapped
  const [head = "", tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const zeros = ip.includes("::") ? 8 - left.length - right.length : 0;
  const groups = [...left, ...Array<string>(zeros).fill("0"), ...right];
  return `${groups.slice(0, 4).join(":")}::/64`;
}
