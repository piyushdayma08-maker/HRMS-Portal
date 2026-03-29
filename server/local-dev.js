const express = require('express');
const { register, login, me, logout } = require('../controllers/authController');
const { index: dashboardIndex } = require('../controllers/dashboardController');
const departmentController = require('../controllers/departmentController');
const employeeController = require('../controllers/employeeController');
const attendanceController = require('../controllers/attendanceController');
const leaveRequestController = require('../controllers/leaveRequestController');
const payrollController = require('../controllers/payrollController');
const { withAuth } = require('../middlewares/auth');
const { withRole } = require('../middlewares/role');

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.use(express.json());
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (process.env.NODE_ENV !== 'production') {
        res.status(500).json({
          message: err?.message || 'Server Error',
          stack: err?.stack || null,
        });
        return;
      }
      res.status(500).json({ message: 'Server Error' });
    }
  };
}

function injectParam(name) {
  return (req, _res, next) => {
    req.query = { ...(req.query || {}), [name]: req.params[name] };
    next();
  };
}

app.post('/api/auth/register', wrap(register));
app.post('/api/auth/login', wrap(login));
app.get('/api/auth/me', wrap(withAuth(me)));
app.post('/api/auth/logout', wrap(withAuth(logout)));

app.get('/api/dashboard', wrap(withAuth(dashboardIndex)));

app.get('/api/departments', wrap(withAuth(departmentController.index)));
app.post(
  '/api/departments',
  wrap(withAuth(withRole(['admin', 'manager'], departmentController.store)))
);
app.get(
  '/api/departments/:department',
  injectParam('department'),
  wrap(withAuth(departmentController.show))
);
app.put(
  '/api/departments/:department',
  injectParam('department'),
  wrap(withAuth(withRole(['admin', 'manager'], departmentController.update)))
);
app.delete(
  '/api/departments/:department',
  injectParam('department'),
  wrap(withAuth(withRole(['admin', 'manager'], departmentController.destroy)))
);

app.get('/api/employees', wrap(withAuth(employeeController.index)));
app.post(
  '/api/employees',
  wrap(withAuth(withRole(['admin', 'manager'], employeeController.store)))
);
app.get(
  '/api/employees/:employee',
  injectParam('employee'),
  wrap(withAuth(employeeController.show))
);
app.put(
  '/api/employees/:employee',
  injectParam('employee'),
  wrap(withAuth(withRole(['admin', 'manager'], employeeController.update)))
);
app.delete(
  '/api/employees/:employee',
  injectParam('employee'),
  wrap(withAuth(withRole(['admin', 'manager'], employeeController.destroy)))
);

app.get('/api/attendances', wrap(withAuth(attendanceController.index)));
app.post(
  '/api/attendances',
  wrap(withAuth(withRole(['admin', 'manager'], attendanceController.store)))
);

app.get('/api/leave-requests', wrap(withAuth(leaveRequestController.index)));
app.post('/api/leave-requests', wrap(withAuth(leaveRequestController.store)));
app.patch(
  '/api/leave-requests/:leaveRequest/status',
  injectParam('leaveRequest'),
  wrap(withAuth(withRole(['admin', 'manager'], leaveRequestController.updateStatus)))
);

app.get('/api/payrolls', wrap(withAuth(payrollController.index)));
app.post(
  '/api/payrolls',
  wrap(withAuth(withRole(['admin', 'manager'], payrollController.store)))
);
app.patch(
  '/api/payrolls/:payroll/mark-paid',
  injectParam('payroll'),
  wrap(withAuth(withRole(['admin', 'manager'], payrollController.markPaid)))
);

app.listen(PORT, () => {
  console.log(`Local API server running on http://127.0.0.1:${PORT}`);
});