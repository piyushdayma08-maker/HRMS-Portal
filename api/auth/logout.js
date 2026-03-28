const { allowMethods } = require('../../middlewares/method');
const { withAuth } = require('../../middlewares/auth');
const { logout } = require('../../controllers/authController');

module.exports = allowMethods(['POST'], withAuth(logout));
