const { z } = require('zod');
const { getJsonBody, ok, error } = require('../lib/http');
const { getQuery } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { buildPagination, getPaginationParams } = require('../lib/pagination');
const { getFullUrl } = require('../lib/request');
const { formatZodErrors, validationError } = require('../lib/validation');
const { leaveRequestResource } = require('../services/serializers');
const { parseDate } = require('../lib/format');

const leaveSchema = z.object({
  employee_id: z.coerce.number().int().positive().optional().nullable(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  type: z.enum(['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity']),
  reason: z.string().optional().nullable(),
});

const leaveStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional().nullable(),
});

async function index(req, res) {
  const query = getQuery(req);
  const { page, perPage } = getPaginationParams(query, { perPage: 10 });

  const where = {};
  if (req.user.role === 'employee' && req.user.employee) {
    where.employeeId = req.user.employee.id;
  }
  if (query.status) {
    where.status = String(query.status);
  }

  const [total, leaves] = await prisma.$transaction([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { user: true } },
        approver: true,
      },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const data = leaves.map(leaveRequestResource);
  const pagination = buildPagination({
    page,
    perPage,
    total,
    path: getFullUrl(req),
  });

  ok(res, { data, ...pagination });
}

async function store(req, res) {
  let body;
  try {
    body = await getJsonBody(req);
  } catch (err) {
    return validationError(res, { body: ['Invalid JSON payload.'] });
  }

  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  const startDate = parseDate(parsed.data.start_date);
  const endDate = parseDate(parsed.data.end_date);
  if (!startDate) {
    return validationError(res, { start_date: ['The start date is not a valid date.'] });
  }
  if (!endDate) {
    return validationError(res, { end_date: ['The end date is not a valid date.'] });
  }
  if (endDate < startDate) {
    return validationError(res, { end_date: ['The end date must be a date after or equal to start date.'] });
  }

  let employeeId = parsed.data.employee_id || null;
  if (req.user.role === 'employee' && req.user.employee) {
    employeeId = req.user.employee.id;
  }

  if (!employeeId) {
    return error(res, 422, 'employee_id is required.');
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return validationError(res, { employee_id: ['The selected employee id is invalid.'] });
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      startDate,
      endDate,
      type: parsed.data.type,
      reason: parsed.data.reason || null,
      status: 'pending',
    },
    include: { employee: { include: { user: true } }, approver: true },
  });

  ok(res, leaveRequestResource(leave));
}

async function updateStatus(req, res) {
  const query = getQuery(req);
  const leaveId = Number(query.leaveRequest || query.id || query.leaveRequestId);
  if (!leaveId) {
    return error(res, 404, 'Leave request not found.');
  }

  const current = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!current) {
    return error(res, 404, 'Leave request not found.');
  }

  let body;
  try {
    body = await getJsonBody(req);
  } catch (err) {
    return validationError(res, { body: ['Invalid JSON payload.'] });
  }

  const parsed = leaveStatusSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  const leave = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: parsed.data.status,
      rejectionReason: parsed.data.status === 'rejected' ? parsed.data.rejection_reason || null : null,
      approvedBy: req.user.id,
      approvedAt: new Date(),
    },
    include: { employee: { include: { user: true } }, approver: true },
  });

  ok(res, leaveRequestResource(leave));
}

module.exports = { index, store, updateStatus };
