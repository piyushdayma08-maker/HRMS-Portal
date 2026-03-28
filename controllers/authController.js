const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { getJsonBody, ok, created } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { createPersonalAccessToken } = require('../lib/auth');
const { formatZodErrors, validationError } = require('../lib/validation');
const { userResource } = require('../services/serializers');

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8),
  password_confirmation: z.string().min(1),
  device_name: z.string().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_name: z.string().max(255).optional(),
});

async function register(req, res) {
  let body;
  try {
    body = await getJsonBody(req);
  } catch (err) {
    return validationError(res, { body: ['Invalid JSON payload.'] });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  if (parsed.data.password_confirmation !== undefined && parsed.data.password !== parsed.data.password_confirmation) {
    return validationError(res, { password: ['The password confirmation does not match.'] });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return validationError(res, { email: ['The email has already been taken.'] });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: 'employee',
    },
    include: { employee: true },
  });

  const token = await createPersonalAccessToken({
    userId: user.id,
    name: parsed.data.device_name || process.env.TOKEN_NAME_DEFAULT || 'web',
  });

  created(res, {
    message: 'Registration successful.',
    token,
    user: userResource(user),
  });
}

async function login(req, res) {
  let body;
  try {
    body = await getJsonBody(req);
  } catch (err) {
    return validationError(res, { body: ['Invalid JSON payload.'] });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(res, formatZodErrors(parsed.error));
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { employee: true },
  });

  if (!user) {
    return validationError(res, { email: ['Invalid credentials.'] });
  }

  const matches = await bcrypt.compare(parsed.data.password, user.password);
  if (!matches) {
    return validationError(res, { email: ['Invalid credentials.'] });
  }

  const token = await createPersonalAccessToken({
    userId: user.id,
    name: parsed.data.device_name || process.env.TOKEN_NAME_DEFAULT || 'web',
  });

  ok(res, {
    message: 'Login successful.',
    token,
    user: userResource(user),
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { employee: true },
  });

  ok(res, userResource(user));
}

async function logout(req, res) {
  if (req.tokenRecord) {
    await prisma.personalAccessToken.delete({ where: { id: req.tokenRecord.id } });
  }

  ok(res, { message: 'Logged out successfully.' });
}

module.exports = {
  register,
  login,
  me,
  logout,
};
