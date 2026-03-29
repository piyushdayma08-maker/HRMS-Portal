const { error } = require('../lib/http');

function allowMethods(methods, handler) {
  return async (req, res) => {
    const origin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      error(res, 405, 'Method Not Allowed');
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (process.env.NODE_ENV !== 'production') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            message: err?.message || 'Server Error',
            stack: err?.stack || null,
          })
        );
        return;
      }
      error(res, 500, 'Server Error');
    }
  };
}

module.exports = { allowMethods };
