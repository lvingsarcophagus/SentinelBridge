import axios from "axios";
import https from "https";

/**
 * HTTPS agent configured to avoid the Windows OpenSSL
 * "bad record mac" (alert 20) error.
 *
 * Root cause: Node.js on Windows reuses TLS connections via
 * keep-alive, and certain packet timing / proxy interference
 * corrupts the MAC on subsequent requests over the same socket.
 *
 * Fix: disable keep-alive so every request gets a fresh TLS
 * handshake, and pin to TLS 1.2+.
 */
const agent = new https.Agent({
  keepAlive: false,
  minVersion: "TLSv1.2",
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_RETRIES = 3;

/**
 * Call the Groq chat completions API with automatic retry
 * on transient SSL / network errors.
 */
export async function callGroq(
  apiKey: string,
  prompt: string,
  { retries = MAX_RETRIES, temperature = 0.1 } = {}
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        GROQ_URL,
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
          httpsAgent: agent,
        }
      );
      return res.data.choices[0].message.content as string;
    } catch (err: any) {
      lastError = err;
      const isSSL =
        err.code === "ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC" ||
        (err.message && err.message.includes("bad record mac"));
      const isNetwork =
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "UND_ERR_SOCKET";

      if ((isSSL || isNetwork) && attempt < retries) {
        const delay = 1000 * attempt; // 1s, 2s, 3s
        console.warn(
          `[WARN] Groq attempt ${attempt}/${retries} failed (${err.code || err.message}). Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Groq call failed after retries");
}
