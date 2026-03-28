const { allowMethods } = require('../../middlewares/method');
const { login } = require('../../controllers/authController');

module.exports = allowMethods(['POST'], login);
