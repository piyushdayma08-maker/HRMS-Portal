const { z } = require('zod');
const { getJsonBody, ok } = require('../lib/http');
const { getQuery } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { buildPagination, getPaginationParams } = require('../lib/pagination');
const { getFullUrl } = require('../lib/request');
const { formatZodErrors, validationError } = require('../lib/validation');
const { attendanceResource } = require('../services/serializers');
const { parseDate } = require('../lib/format');

const attendanceSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  date: z.string().min(1),
  check_in: z.string().optional().nullable(),
  check_out: z.string().optional().nullable(),
  status: z.enum(['present', 'absent', 'half_day', 'remote', 'late']),
  notes: z.string().optional().nullable(),
});

function isValidTime(value) {
  if (!value) return true;
  return /^\d{2}:\d{2}:\d{2}$/.test(value);
}

async function index(req, res) {
  const query = getQuery(req);
  const { page, perPage } = getPaginationParams(query, { perPage: 15 });

  const where = {};
  if (query.employee_id) {
    where.employeeId = Number(query.employee_id);
  }

  if (query.date_from) {
    const from = parseDate(query.date_from);
    if (from) {
      where.date = { ...(where.date || {}), gte: from };
    }
  }

  if (query.date_to) {
    const to = parseDate(query.date_to);
    if (to) {
      where.date = { ...(where.date || {}), lte: to };
    }
  }

  const [total, attendances] = await prisma.$transaction([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { employee: { include: { user: true } } },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const data = attendances.map(attendanceResource);
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

  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  if (!parseDate(parsed.data.date)) {
    return validationError(res, { date: ['The date is not a valid date.'] });
  }

  if (!isValidTime(parsed.data.check_in)) {
    return validationError(res, { check_in: ['The check in does not match the format H:i:s.'] });
  }

  if (!isValidTime(parsed.data.check_out)) {
    return validationError(res, { check_out: ['The check out does not match the format H:i:s.'] });
  }

  const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employee_id } });
  if (!employee) {
    return validationError(res, { employee_id: ['The selected employee id is invalid.'] });
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: parsed.data.employee_id,
        date: parseDate(parsed.data.date),
      },
    },
    create: {
      employeeId: parsed.data.employee_id,
      date: parseDate(parsed.data.date),
      checkIn: parsed.data.check_in || null,
      checkOut: parsed.data.check_out || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    },
    update: {
      checkIn: parsed.data.check_in || null,
      checkOut: parsed.data.check_out || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    },
    include: { employee: { include: { user: true } } },
  });

  ok(res, attendanceResource(attendance));
}

module.exports = { index, store };
