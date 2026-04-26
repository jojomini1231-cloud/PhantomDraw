import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function splitTokens(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function getSessionAccessToken(payload: any): string | null {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return null;
  if (payload.accessToken) return String(payload.accessToken);
  if (payload.access_token) return String(payload.access_token);
  return null;
}

export function getCpaAccessToken(payload: any): string | null {
  // CPA files sometimes have access_token nested or the object itself might have different structures.
  // The provided example has it at the top level as access_token.
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      return payload;
    }
  }
  if (!payload || typeof payload !== "object") return null;
  if (payload.access_token) return String(payload.access_token);
  if (payload.accessToken) return String(payload.accessToken);
  return null;
}
