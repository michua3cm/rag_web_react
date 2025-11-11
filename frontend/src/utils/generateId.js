// ============================
// src/utils/generateId.js
// ============================
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique UUID (v4).
 * @returns {string} A universally unique identifier.
 */
export function generateId() {
    return uuidv4();
}
