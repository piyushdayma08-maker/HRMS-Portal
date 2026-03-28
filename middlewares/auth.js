const { error } = require('../lib/http');
const { findTokenRecord } = require('../lib/auth');
const { prisma } = require('../lib/prisma');

function withAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const tokenData = await findTokenRecord(token);
    if (!tokenData) {
      error(res, 401, 'Unauthenticated.');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenData.record.tokenableId },
      include: { employee: true },
    });

    if (!user) {
      error(res, 401, 'Unauthenticated.');
      return;
    }

    await prisma.personalAccessToken.update({
      where: { id: tokenData.record.id },
      data: { lastUsedAt: new Date() },
    });

    req.user = user;
    req.tokenRecord = tokenData.record;

    await handler(req, res);
  };
}

module.exports = { withAuth };
