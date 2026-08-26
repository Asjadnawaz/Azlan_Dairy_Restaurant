import https from "https";
import dns from "dns";

/**
 * Custom DNS lookup with public DNS fallback servers.
 * Solves Windows / local ISP `getaddrinfo ENOTFOUND` failures for api.resend.com.
 */
let fallbackResolver: dns.Resolver | null = null;
try {
  fallbackResolver = new dns.Resolver();
  fallbackResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);
} catch {
  // Ignore if custom server assignment is unsupported
}

/**
 * Clean sender email address without accidental quotes from .env.
 */
export function getFromEmail(): string {
  const envFrom = process.env.RESEND_FROM_EMAIL?.replace(/^["']|["']$/g, "").trim();
  return envFrom || "Azlan Fast Food <orders@azlanfastfood.com>";
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  data: { id: string } | null;
  error: { message: string; name?: string; statusCode?: number } | null;
}

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/**
 * Primary dispatcher: uses globalThis.fetch (works on Vercel, Cloudflare Workers,
 * Node 18+). No DNS issues in serverless environments.
 */
async function sendViaFetch(apiKey: string, payload: Record<string, unknown>): Promise<SendEmailResult> {
  try {
    const res = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      return { data: data as { id: string }, error: null };
    }
    return {
      data: null,
      error: {
        message: (data as { message?: string }).message || `HTTP ${res.status}`,
        name: (data as { name?: string }).name,
        statusCode: res.status,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { data: null, error: { message } };
  }
}

/**
 * Fallback dispatcher: native Node.js https with custom DNS resolver.
 * Used when globalThis.fetch fails with DNS errors (common on Windows local dev).
 */
async function sendViaHttps(apiKey: string, payload: Record<string, unknown>): Promise<SendEmailResult> {
  return new Promise((resolve) => {
    const payloadStr = JSON.stringify(payload);

    const reqOptions: https.RequestOptions = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payloadStr),
      },
    };

    // Add custom DNS lookup with fallback if available
    if (fallbackResolver) {
      reqOptions.lookup = ((
        hostname: string,
        options: dns.LookupOptions,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
      ) => {
        dns.lookup(hostname, options, (err, address, family) => {
          if (!err && address && typeof address === "string") {
            return callback(null, address, typeof family === "number" ? family : 4);
          }
          // Fallback to public DNS
          fallbackResolver!.resolve4(hostname, (resErr, addresses) => {
            if (!resErr && addresses && addresses.length > 0) {
              return callback(null, addresses[0], 4);
            }
            callback(
              err || resErr,
              typeof address === "string" ? address : "",
              typeof family === "number" ? family : 4
            );
          });
        });
      }) as unknown as typeof dns.lookup;
    }

    const req = https.request(RESEND_EMAILS_URL, reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body || "{}");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: parsed as { id: string }, error: null });
          } else {
            resolve({
              data: null,
              error: {
                message: parsed.message || `HTTP ${res.statusCode}: ${body}`,
                name: parsed.name,
                statusCode: res.statusCode,
              },
            });
          }
        } catch {
          resolve({ data: null, error: { message: `Failed to parse: ${body}` } });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ data: null, error: { message: err.message, name: err.name } });
    });

    req.write(payloadStr);
    req.end();
  });
}

/**
 * Robust email dispatcher for Azlan Fast Food transactional emails.
 *
 * Strategy: try fetch first (works in production / serverless). If it fails
 * with a network/DNS error AND we have native https available, retry with
 * the https+customDNS fallback (covers Windows local dev).
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not configured. Skipping email.");
    return { data: null, error: { message: "Missing RESEND_API_KEY" } };
  }

  const cleanTo = (to || "").trim();
  if (!cleanTo || !cleanTo.includes("@")) {
    console.warn(`⚠️ Invalid recipient email: "${to}". Skipping.`);
    return { data: null, error: { message: "Invalid recipient email" } };
  }

  const from = getFromEmail();
  const payload = { from, to: cleanTo, subject, html };

  // 1. Try fetch (default, works everywhere in production)
  const fetchResult = await sendViaFetch(apiKey, payload);

  if (fetchResult.data) {
    console.log(`📧 Email delivered [to: ${cleanTo}, id: ${fetchResult.data.id}]`);
    return fetchResult;
  }

  // 2. If fetch failed with a network/DNS error, try https fallback
  const isDnsError = fetchResult.error?.message?.includes("ENOTFOUND") ||
    fetchResult.error?.message?.includes("Unable to fetch data") ||
    fetchResult.error?.message?.includes("fetch failed");

  if (isDnsError && typeof https?.request === "function") {
    console.warn(`⚠️ Fetch failed (${fetchResult.error?.message}), retrying with HTTPS fallback...`);
    const httpsResult = await sendViaHttps(apiKey, payload);

    if (httpsResult.data) {
      console.log(`📧 Email delivered via HTTPS fallback [to: ${cleanTo}, id: ${httpsResult.data.id}]`);
      return httpsResult;
    }

    console.error(`❌ HTTPS fallback also failed [to: ${cleanTo}]:`, httpsResult.error);
    return httpsResult;
  }

  console.error(`❌ Email failed [to: ${cleanTo}, subject: "${subject}"]:`, fetchResult.error);
  return fetchResult;
}
