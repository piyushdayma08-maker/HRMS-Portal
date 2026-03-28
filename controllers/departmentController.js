const { z } = require('zod');
const { getJsonBody, ok, error } = require('../lib/http');
const { getQuery } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { buildPagination, getPaginationParams } = require('../lib/pagination');
const { getFullUrl } = require('../lib/request');
const { formatZodErrors, validationError } = require('../lib/validation');
const { departmentResource } = require('../services/serializers');

const departmentSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  head_employee_id: z.number().int().positive().optional().nullable(),
});

async function index(req, res) {
  const query = getQuery(req);
  const search = query.search ? String(query.search) : null;
  const { page, perPage } = getPaginationParams(query, { perPage: 10 });

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
        ],
      }
    : {};

  const [total, departments] = await prisma.$transaction([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        head: { include: { user: true } },
        _count: { select: { employees: true } },
      },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const data = departments.map(departmentResource);
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

  const parsed = departmentSchema.safeParse({
    ...body,
    head_employee_id: body.head_employee_id === '' ? null : body.head_employee_id,
  });
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  const existing = await prisma.department.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return validationError(res, { code: ['The code has already been taken.'] });
  }

  if (parsed.data.head_employee_id) {
    const head = await prisma.employee.findUnique({ where: { id: parsed.data.head_employee_id } });
    if (!head) {
      return validationError(res, { head_employee_id: ['The selected head employee id is invalid.'] });
    }
  }

  const department = await prisma.department.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description || null,
      headEmployeeId: parsed.data.head_employee_id || null,
    },
    include: { head: { include: { user: true } }, _count: { select: { employees: true } } },
  });

  ok(res, departmentResource(department));
}

async function show(req, res) {
  const query = getQuery(req);
  const departmentId = Number(query.department || query.id || query.departmentId);
  if (!departmentId) {
    return error(res, 404, 'Department not found.');
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { head: { include: { user: true } }, _count: { select: { employees: true } } },
  });

  if (!department) {
    return error(res, 404, 'Department not found.');
  }

  ok(res, departmentResource(department));
}

async function update(req, res) {
  const query = getQuery(req);
  const departmentId = Number(query.department || query.id || query.departmentId);
  if (!departmentId) {
    return error(res, 404, 'Department not found.');
  }

  const current = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!current) {
    return error(res, 404, 'Department not found.');
  }

  let body;
  try {
    body = await getJsonBody(req);
  } catch (err) {
    return validationError(res, { body: ['Invalid JSON payload.'] });
  }

  const parsed = departmentSchema.safeParse({
    ...body,
    head_employee_id: body.head_employee_id === '' ? null : body.head_employee_id,
  });
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  const existing = await prisma.department.findUnique({ where: { code: parsed.data.code } });
  if (existing && existing.id !== departmentId) {
    return validationError(res, { code: ['The code has already been taken.'] });
  }

  if (parsed.data.head_employee_id) {
    const head = await prisma.employee.findUnique({ where: { id: parsed.data.head_employee_id } });
    if (!head) {
      return validationError(res, { head_employee_id: ['The selected head employee id is invalid.'] });
    }
  }

  const department = await prisma.department.update({
    where: { id: departmentId },
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description || null,
      headEmployeeId: parsed.data.head_employee_id || null,
    },
    include: { head: { include: { user: true } }, _count: { select: { employees: true } } },
  });

  ok(res, departmentResource(department));
}

async function destroy(req, res) {
  const query = getQuery(req);
  const departmentId = Number(query.department || query.id || query.departmentId);
  if (!departmentId) {
    return error(res, 404, 'Department not found.');
  }

  const current = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!current) {
    return error(res, 404, 'Department not found.');
  }

  await prisma.department.delete({ where: { id: departmentId } });

  ok(res, { message: 'Department deleted successfully.' });
}

module.exports = {
  index,
  store,
  show,
  update,
  destroy,
};
