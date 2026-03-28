const { allowMethods } = require('../../middlewares/method');
const { withAuth } = require('../../middlewares/auth');
const { me } = require('../../controllers/authController');

module.exports = allowMethods(['GET'], withAuth(me));
