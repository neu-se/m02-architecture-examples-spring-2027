// Auth module: decides who is making a request.
// Information hiding: callers see only `authenticate` and `hashPassword`.
// How passwords are hashed and checked, and where the admin password comes
// from, are private.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { ADMIN_NAME } from "./admin.ts";
import type { Repository } from "./repository.ts";

export type Credentials = { user: string; password: string };

export type Identity = { name: string; isAdmin: boolean };

export interface Auth {
  /** Who is this? Resolves to undefined if the credentials are not valid. */
  authenticate(credentials: Credentials): Promise<Identity | undefined>;
  /** Turns a password into the text that is stored in place of it. */
  hashPassword(password: string): Promise<string>;
}

export function createAuth(repository: Repository, adminPassword: string): Auth {
  const adminHash = hash(adminPassword);

  return {
    hashPassword: hash,

    async authenticate({ user, password }) {
      if (user === ADMIN_NAME) {
        // Only the configured admin password counts, never a stored record.
        return (await matches(password, await adminHash))
          ? { name: ADMIN_NAME, isAdmin: true }
          : undefined;
      }

      const student = await repository.getStudent(user);
      if (student && (await matches(password, student.passwordHash))) {
        return { name: student.name, isAdmin: false };
      }
      return undefined;
    },
  };
}

// ---- Private helpers: password hashing -----------------------------------

const KEY_LENGTH = 64;

// scrypt is slow on purpose, so Node runs it in the background and calls us
// back when it is done. promisify turns that callback style into a Promise.
// Node's typings lose the result type here, so we state it.
const deriveKey = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  length: number,
) => Promise<Buffer>;

async function hash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function matches(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  const expected = Buffer.from(key, "hex");
  const actual = await deriveKey(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
