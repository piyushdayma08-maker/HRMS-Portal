const { allowMethods } = require('../../middlewares/method');
const { withAuth } = require('../../middlewares/auth');
const { withRole } = require('../../middlewares/role');
const { index, store } = require('../../controllers/departmentController');

async function handler(req, res) {
  if (req.method === 'GET') {
    return index(req, res);
  }
  if (req.method === 'POST') {
    return withRole(['admin', 'manager'], store)(req, res);
  }
}

module.exports = allowMethods(['GET', 'POST'], withAuth(handler));
