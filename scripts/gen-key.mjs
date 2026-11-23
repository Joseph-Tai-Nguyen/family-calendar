// Prints a random 256-bit key (base64) for TOKEN_ENCRYPTION_KEY.
import { randomBytes } from 'node:crypto';

console.log(randomBytes(32).toString('base64'));
