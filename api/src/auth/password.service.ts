import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const key = scryptSync(password, salt, KEY_LENGTH).toString('hex');
    return `scrypt:${salt}:${key}`;
  }

  verify(password: string, storedHash: string): boolean {
    const [algorithm, salt, key] = storedHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !key) {
      return false;
    }

    const actual = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString('hex'));
    const expected = Buffer.from(key);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
