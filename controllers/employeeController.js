const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { getJsonBody, ok, error } = require('../lib/http');
const { getQuery } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { buildPagination, getPaginationParams } = require('../lib/pagination');
const { getFullUrl } = require('../lib/request');
const { formatZodErrors, validationError } = require('../lib/validation');
const { employeeResource } = require('../services/serializers');
const { parseDate } = require('../lib/format');

const statusValues = ['active', 'inactive', 'on_leave', 'resigned'];
const roleValues = ['employee', 'manager'];

const employeeSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).optional().nullable(),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  manager_id: z.coerce.number().int().positive().optional().nullable(),
  employee_code: z.string().min(1).max(50),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().optional().nullable(),
  designation: z.string().min(1).max(255),
  date_of_birth: z.string().optional().nullable(),
  join_date: z.string().min(1),
  salary: z.coerce.number().min(0),
  status: z.enum(statusValues),
  role: z.enum(roleValues).optional().nullable(),
});

function isValidDate(value) {
  return Boolean(parseDate(value));
}

async function index(req, res) {
  const query = getQuery(req);
  const { page, perPage } = getPaginationParams(query, { perPage: 10 });
  const where = {};

  if (query.department_id) {
    where.departmentId = Number(query.department_id);
  }
  if (query.status) {
    where.status = String(query.status);
  }
  if (query.search) {
    const search = String(query.search);
    where.OR = [
      { employeeCode: { contains: search } },
      { designation: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
    ];
  }

  const [total, employees] = await prisma.$transaction([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        department: true,
        manager: { include: { user: true } },
      },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const data = employees.map(employeeResource);
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

  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  if (parsed.data.date_of_birth && !isValidDate(parsed.data.date_of_birth)) {
    return validationError(res, { date_of_birth: ['The date of birth is not a valid date.'] });
  }
  if (!isValidDate(parsed.data.join_date)) {
    return validationError(res, { join_date: ['The join date is not a valid date.'] });
  }

  const emailExists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (emailExists) {
    return validationError(res, { email: ['The email has already been taken.'] });
  }

  const employeeCodeExists = await prisma.employee.findUnique({ where: { employeeCode: parsed.data.employee_code } });
  if (employeeCodeExists) {
    return validationError(res, { employee_code: ['The employee code has already been taken.'] });
  }

  if (parsed.data.department_id) {
    const department = await prisma.department.findUnique({ where: { id: parsed.data.department_id } });
    if (!department) {
      return validationError(res, { department_id: ['The selected department id is invalid.'] });
    }
  }

  if (parsed.data.manager_id) {
    const manager = await prisma.employee.findUnique({ where: { id: parsed.data.manager_id } });
    if (!manager) {
      return validationError(res, { manager_id: ['The selected manager id is invalid.'] });
    }
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password || 'password123', 10);

  const employee = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: parsed.data.role || 'employee',
      },
    });

    return tx.employee.create({
      data: {
        userId: user.id,
        departmentId: parsed.data.department_id || null,
        managerId: parsed.data.manager_id || null,
        employeeCode: parsed.data.employee_code,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        designation: parsed.data.designation,
        dateOfBirth: parsed.data.date_of_birth ? parseDate(parsed.data.date_of_birth) : null,
        joinDate: parseDate(parsed.data.join_date),
        salary: parsed.data.salary,
        status: parsed.data.status,
      },
      include: {
        user: true,
        department: true,
        manager: { include: { user: true } },
      },
    });
  });

  ok(res, employeeResource(employee));
}

async function show(req, res) {
  const query = getQuery(req);
  const employeeId = Number(query.employee || query.id || query.employeeId);
  if (!employeeId) {
    return error(res, 404, 'Employee not found.');
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true, department: true, manager: { include: { user: true } } },
  });

  if (!employee) {
    return error(res, 404, 'Employee not found.');
  }

  ok(res, employeeResource(employee));
}

async function update(req, res) {
  const query = getQuery(req);
  const employeeId = Number(query.employee || query.id || query.employeeId);
  if (!employeeId) {
    return error(res, 404, 'Employee not found.');
  }

  const current = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!current) {
    return error(res, 404, 'Employee not found.');
  }

  let body;
  try {
    body = await getJsonBody(req);
  } catch (err) {
    return validationError(res, { body: ['Invalid JSON payload.'] });
  }

  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  if (parsed.data.manager_id && parsed.data.manager_id === employeeId) {
    return validationError(res, { manager_id: ['The selected manager id is invalid.'] });
  }

  if (parsed.data.date_of_birth && !isValidDate(parsed.data.date_of_birth)) {
    return validationError(res, { date_of_birth: ['The date of birth is not a valid date.'] });
  }
  if (!isValidDate(parsed.data.join_date)) {
    return validationError(res, { join_date: ['The join date is not a valid date.'] });
  }

  const emailExists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (emailExists && emailExists.id !== current.userId) {
    return validationError(res, { email: ['The email has already been taken.'] });
  }

  const employeeCodeExists = await prisma.employee.findUnique({ where: { employeeCode: parsed.data.employee_code } });
  if (employeeCodeExists && employeeCodeExists.id !== employeeId) {
    return validationError(res, { employee_code: ['The employee code has already been taken.'] });
  }

  if (parsed.data.department_id) {
    const department = await prisma.department.findUnique({ where: { id: parsed.data.department_id } });
    if (!department) {
      return validationError(res, { department_id: ['The selected department id is invalid.'] });
    }
  }

  if (parsed.data.manager_id) {
    const manager = await prisma.employee.findUnique({ where: { id: parsed.data.manager_id } });
    if (!manager) {
      return validationError(res, { manager_id: ['The selected manager id is invalid.'] });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: current.userId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role || current.user.role,
        ...(parsed.data.password
          ? { password: await bcrypt.hash(parsed.data.password, 10) }
          : {}),
      },
    });

    await tx.employee.update({
      where: { id: employeeId },
      data: {
        departmentId: parsed.data.department_id || null,
        managerId: parsed.data.manager_id || null,
        employeeCode: parsed.data.employee_code,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        designation: parsed.data.designation,
        dateOfBirth: parsed.data.date_of_birth ? parseDate(parsed.data.date_of_birth) : null,
        joinDate: parseDate(parsed.data.join_date),
        salary: parsed.data.salary,
        status: parsed.data.status,
      },
    });
  });

  const updated = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true, department: true, manager: { include: { user: true } } },
  });

  ok(res, employeeResource(updated));
}

async function destroy(req, res) {
  const query = getQuery(req);
  const employeeId = Number(query.employee || query.id || query.employeeId);
  if (!employeeId) {
    return error(res, 404, 'Employee not found.');
  }

  const current = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!current) {
    return error(res, 404, 'Employee not found.');
  }

  await prisma.user.delete({ where: { id: current.userId } });

  ok(res, { message: 'Employee deleted successfully.' });
}

module.exports = {
  index,
  store,
  show,
  update,
  destroy,
};
