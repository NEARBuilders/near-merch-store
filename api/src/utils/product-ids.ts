import { nanoid } from 'nanoid';
import { uuidv7 } from 'uuidv7';

/**
 * Generate a slug-friendly string from product name
 * Converts "Near Extreme Black Hat" -> "near-extreme-black-hat"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a new product ID (UUID v7)
 */
export function generateProductId(): string {
  return uuidv7();
}

/**
 * Generate a public key (12 character nanoid) for URLs
 */
export function generatePublicKey(): string {
  return nanoid(12);
}

/**
 * Generate a slug with publicKey appended
 * e.g., "near-extreme-black-hat-449343436748"
 */
export function generateSlug(name: string, publicKey: string): string {
  const nameSlug = slugify(name);
  return `${nameSlug}-${publicKey}`;
}

/**
 * Extract publicKey from slug
 * e.g., "near-extreme-black-hat-449343436748" -> "449343436748"
 * e.g., "near-extreme-white-hat-_VTcbn-dDoK4" -> "_VTcbn-dDoK4"
 * 
 * The publicKey is always the last 12 characters of the slug (nanoid is always 12 chars)
 */
export function extractPublicKeyFromSlug(slug: string): string | null {
  // Extract the last 12 characters (nanoid is always 12 characters)
  // This handles cases where the publicKey contains hyphens or underscores
  if (slug.length < 12) {
    return null;
  }
  
  const publicKey = slug.slice(-12);
  
  // Validate it looks like a nanoid (12 alphanumeric/underscore/hyphen chars)
  if (/^[A-Za-z0-9_-]{12}$/.test(publicKey)) {
    return publicKey;
  }
  
  return null;
}

