const { allowMethods } = require('../../../middlewares/method');
const { withAuth } = require('../../../middlewares/auth');
const { withRole } = require('../../../middlewares/role');
const { updateStatus } = require('../../../controllers/leaveRequestController');

module.exports = allowMethods(
  ['PATCH'],
  withAuth(withRole(['admin', 'manager'], updateStatus))
);
