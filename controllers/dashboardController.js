const { ok } = require('../lib/http');
const { prisma } = require('../lib/prisma');
const { formatDate } = require('../lib/format');

async function index(req, res) {
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = formatDate(now);
  const monthYear = now.toISOString().slice(0, 7);

  const [departmentCount, employeeCount, pendingLeaves, todayAttendance, payrollTotal, recentLeaves] =
    await prisma.$transaction([
      prisma.department.count(),
      prisma.employee.count(),
      prisma.leaveRequest.count({ where: { status: 'pending' } }),
      prisma.attendance.count({ where: { date: todayDate } }),
      prisma.payroll.aggregate({
        where: { monthYear },
        _sum: { netSalary: true },
      }),
      prisma.leaveRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { employee: { include: { user: true } } },
      }),
    ]);

  const payrollSum = payrollTotal._sum.netSalary || 0;

  ok(res, {
    stats: {
      departments: departmentCount,
      employees: employeeCount,
      pending_leaves: pendingLeaves,
      today_attendance: todayAttendance,
      monthly_payroll_total: Number(payrollSum) || 0,
    },
    recent_leaves: recentLeaves.map((leave) => ({
      id: leave.id,
      employee_name: leave.employee?.user?.name || null,
      type: leave.type,
      start_date: formatDate(leave.startDate),
      end_date: formatDate(leave.endDate),
      status: leave.status,
    })),
  });
}

module.exports = { index };
