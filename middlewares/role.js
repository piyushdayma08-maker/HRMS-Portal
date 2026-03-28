const { error } = require('../lib/http');

function withRole(roles, handler) {
  return async (req, res) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      error(res, 403, 'You do not have permission for this action.');
      return;
    }

    await handler(req, res);
  };
}

module.exports = { withRole };
