const { allowMethods } = require('../../middlewares/method');
const { withAuth } = require('../../middlewares/auth');
const { withRole } = require('../../middlewares/role');
const { show, update, destroy } = require('../../controllers/departmentController');

async function handler(req, res) {
  if (req.method === 'GET') {
    return show(req, res);
  }
  if (req.method === 'PUT') {
    return withRole(['admin', 'manager'], update)(req, res);
  }
  if (req.method === 'DELETE') {
    return withRole(['admin', 'manager'], destroy)(req, res);
  }
}

module.exports = allowMethods(['GET', 'PUT', 'DELETE'], withAuth(handler));
