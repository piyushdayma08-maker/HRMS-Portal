const { allowMethods } = require('../../middlewares/method');
const { withAuth } = require('../../middlewares/auth');
const { index, store } = require('../../controllers/leaveRequestController');

async function handler(req, res) {
  if (req.method === 'GET') {
    return index(req, res);
  }
  if (req.method === 'POST') {
    return store(req, res);
  }
}

module.exports = allowMethods(['GET', 'POST'], withAuth(handler));
