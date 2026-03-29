const { register, login, me, logout } = require('../controllers/authController');
const { index: dashboardIndex } = require('../controllers/dashboardController');
const departmentController = require('../controllers/departmentController');
const employeeController = require('../controllers/employeeController');
const attendanceController = require('../controllers/attendanceController');
const leaveRequestController = require('../controllers/leaveRequestController');
const payrollController = require('../controllers/payrollController');
const { withAuth } = require('../middlewares/auth');
const { withRole } = require('../middlewares/role');

function setCors(res) {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (process.env.NODE_ENV !== 'production') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: err?.message || 'Server Error', stack: err?.stack || null }));
        return;
      }
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Server Error' }));
    }
  };
}

function pathMatch(method, pattern, pathname) {
  if (method && method !== '*') {
    // method match handled outside
  }
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    const actual = pathParts[i];
    if (part.startsWith(':')) {
      params[part.slice(1)] = actual;
    } else if (part !== actual) {
      return null;
    }
  }
  return params;
}

function injectParams(req, params) {
  req.query = { ...(req.query || {}), ...params };
}

const routes = [
  { method: 'POST', path: '/auth/register', handler: wrap(register) },
  { method: 'POST', path: '/auth/login', handler: wrap(login) },
  { method: 'GET', path: '/auth/me', handler: wrap(withAuth(me)) },
  { method: 'POST', path: '/auth/logout', handler: wrap(withAuth(logout)) },

  { method: 'GET', path: '/dashboard', handler: wrap(withAuth(dashboardIndex)) },

  { method: 'GET', path: '/departments', handler: wrap(withAuth(departmentController.index)) },
  {
    method: 'POST',
    path: '/departments',
    handler: wrap(withAuth(withRole(['admin', 'manager'], departmentController.store))),
  },
  { method: 'GET', path: '/departments/:department', handler: wrap(withAuth(departmentController.show)) },
  {
    method: 'PUT',
    path: '/departments/:department',
    handler: wrap(withAuth(withRole(['admin', 'manager'], departmentController.update))),
  },
  {
    method: 'DELETE',
    path: '/departments/:department',
    handler: wrap(withAuth(withRole(['admin', 'manager'], departmentController.destroy))),
  },

  { method: 'GET', path: '/employees', handler: wrap(withAuth(employeeController.index)) },
  {
    method: 'POST',
    path: '/employees',
    handler: wrap(withAuth(withRole(['admin', 'manager'], employeeController.store))),
  },
  { method: 'GET', path: '/employees/:employee', handler: wrap(withAuth(employeeController.show)) },
  {
    method: 'PUT',
    path: '/employees/:employee',
    handler: wrap(withAuth(withRole(['admin', 'manager'], employeeController.update))),
  },
  {
    method: 'DELETE',
    path: '/employees/:employee',
    handler: wrap(withAuth(withRole(['admin', 'manager'], employeeController.destroy))),
  },

  { method: 'GET', path: '/attendances', handler: wrap(withAuth(attendanceController.index)) },
  {
    method: 'POST',
    path: '/attendances',
    handler: wrap(withAuth(withRole(['admin', 'manager'], attendanceController.store))),
  },

  { method: 'GET', path: '/leave-requests', handler: wrap(withAuth(leaveRequestController.index)) },
  { method: 'POST', path: '/leave-requests', handler: wrap(withAuth(leaveRequestController.store)) },
  {
    method: 'PATCH',
    path: '/leave-requests/:leaveRequest/status',
    handler: wrap(withAuth(withRole(['admin', 'manager'], leaveRequestController.updateStatus))),
  },

  { method: 'GET', path: '/payrolls', handler: wrap(withAuth(payrollController.index)) },
  {
    method: 'POST',
    path: '/payrolls',
    handler: wrap(withAuth(withRole(['admin', 'manager'], payrollController.store))),
  },
  {
    method: 'PATCH',
    path: '/payrolls/:payroll/mark-paid',
    handler: wrap(withAuth(withRole(['admin', 'manager'], payrollController.markPaid))),
  },
];

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/^\/api/, '') || '/';

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const params = pathMatch(route.method, route.path, pathname);
    if (!params) continue;
    injectParams(req, params);
    await route.handler(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Not Found' }));
};