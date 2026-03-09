import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "tmp", "cache");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function getCachedAiResponse(cacheKey: string, ttlSeconds: number = 30) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  if (fs.existsSync(cachePath)) {
    const stats = fs.statSync(cachePath);
    const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
    
    if (ageSeconds < ttlSeconds) {
      try {
        const data = fs.readFileSync(cachePath, "utf-8");
        return JSON.parse(data);
      } catch (e) {
        console.error(`Failed to read cache for ${cacheKey}:`, e);
      }
    }
  }
  
  return null;
}

export function setCachedAiResponse(cacheKey: string, data: any) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to write cache for ${cacheKey}:`, e);
  }
}
