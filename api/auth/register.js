const { allowMethods } = require('../../middlewares/method');
const { register } = require('../../controllers/authController');

module.exports = allowMethods(['POST'], register);
