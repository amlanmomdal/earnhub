import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashValue = async (value: string): Promise<string> =>
  bcrypt.hash(value, SALT_ROUNDS);

export const compareValues = async (
  raw: string,
  hashed: string,
): Promise<boolean> => bcrypt.compare(raw, hashed);
