const { allowMethods } = require('../middlewares/method');
const { withAuth } = require('../middlewares/auth');
const { index } = require('../controllers/dashboardController');

module.exports = allowMethods(['GET'], withAuth(index));
