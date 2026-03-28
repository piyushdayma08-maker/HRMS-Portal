const { z } = require('zod');
const { getJsonBody, ok, error } = require('../lib/http');
const { getQuery } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { buildPagination, getPaginationParams } = require('../lib/pagination');
const { getFullUrl } = require('../lib/request');
const { formatZodErrors, validationError } = require('../lib/validation');
const { payrollResource } = require('../services/serializers');

const payrollSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  month_year: z.string().regex(/^\d{4}-\d{2}$/),
  basic_salary: z.coerce.number().min(0),
  allowances: z.coerce.number().min(0).optional().nullable(),
  deductions: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(['generated', 'paid', 'hold']).optional().nullable(),
});

async function index(req, res) {
  const query = getQuery(req);
  const { page, perPage } = getPaginationParams(query, { perPage: 10 });

  const where = {};
  if (req.user.role === 'employee' && req.user.employee) {
    where.employeeId = req.user.employee.id;
  }
  if (query.month_year) {
    where.monthYear = String(query.month_year);
  }

  const [total, payrolls] = await prisma.$transaction([
    prisma.payroll.count({ where }),
    prisma.payroll.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { include: { user: true } } },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const data = payrolls.map(payrollResource);
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

  const parsed = payrollSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employee_id } });
  if (!employee) {
    return validationError(res, { employee_id: ['The selected employee id is invalid.'] });
  }

  const allowances = parsed.data.allowances ?? 0;
  const deductions = parsed.data.deductions ?? 0;
  const netSalary = parsed.data.basic_salary + allowances - deductions;

  const payroll = await prisma.payroll.upsert({
    where: {
      employeeId_monthYear: {
        employeeId: parsed.data.employee_id,
        monthYear: parsed.data.month_year,
      },
    },
    create: {
      employeeId: parsed.data.employee_id,
      monthYear: parsed.data.month_year,
      basicSalary: parsed.data.basic_salary,
      allowances,
      deductions,
      netSalary,
      status: parsed.data.status || 'generated',
    },
    update: {
      basicSalary: parsed.data.basic_salary,
      allowances,
      deductions,
      netSalary,
      status: parsed.data.status || 'generated',
    },
    include: { employee: { include: { user: true } } },
  });

  ok(res, payrollResource(payroll));
}

async function markPaid(req, res) {
  const query = getQuery(req);
  const payrollId = Number(query.payroll || query.id || query.payrollId);
  if (!payrollId) {
    return error(res, 404, 'Payroll not found.');
  }

  const current = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!current) {
    return error(res, 404, 'Payroll not found.');
  }

  const payroll = await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
    include: { employee: { include: { user: true } } },
  });

  ok(res, payrollResource(payroll));
}

module.exports = { index, store, markPaid };
