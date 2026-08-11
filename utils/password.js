const crypto = require('crypto');

// Hashes a plaintext password with a random salt using scrypt, returning
// "salt:hash" as a single string ready to store in the users table.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Re-derives the hash for a login attempt using the stored salt, then compares
// it to the stored hash in constant time to avoid leaking timing information.
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex'));
}

module.exports = { hashPassword, verifyPassword };
