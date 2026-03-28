const { error } = require('../lib/http');

function allowMethods(methods, handler) {
  return async (req, res) => {
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      error(res, 405, 'Method Not Allowed');
      return;
    }
    await handler(req, res);
  };
}

module.exports = { allowMethods };
