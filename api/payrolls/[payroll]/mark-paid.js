const { allowMethods } = require('../../../middlewares/method');
const { withAuth } = require('../../../middlewares/auth');
const { withRole } = require('../../../middlewares/role');
const { markPaid } = require('../../../controllers/payrollController');

module.exports = allowMethods(
  ['PATCH'],
  withAuth(withRole(['admin', 'manager'], markPaid))
);
