const crypto = require('crypto');
const { prisma } = require('./prisma');

const TOKENABLE_TYPE = 'App\\\\Models\\\\User';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

async function createPersonalAccessToken({ userId, name }) {
  const plain = generateTokenString();
  const token = hashToken(plain);
  const record = await prisma.personalAccessToken.create({
    data: {
      tokenableType: TOKENABLE_TYPE,
      tokenableId: userId,
      name,
      token,
      abilities: null,
    },
  });

  return `${record.id}|${plain}`;
}

async function findTokenRecord(bearerToken) {
  if (!bearerToken || !bearerToken.includes('|')) return null;
  const [idPart, plain] = bearerToken.split('|');
  const tokenId = Number(idPart);
  if (!tokenId || !plain) return null;

  const record = await prisma.personalAccessToken.findUnique({
    where: { id: tokenId },
  });
  if (!record) return null;
  if (record.tokenableType !== TOKENABLE_TYPE) return null;

  const hashed = hashToken(plain);
  if (record.token !== hashed) return null;

  return { record, plain };
}

module.exports = {
  createPersonalAccessToken,
  findTokenRecord,
};
