const { formatDate, formatDateTime, formatDecimal } = require('../lib/format');

function userResource(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employee_id: user.employee ? user.employee.id : null,
    created_at: formatDateTime(user.createdAt || user.created_at),
  };
}

function departmentResource(department) {
  if (!department) return null;
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    head_employee_id: department.headEmployeeId ?? department.head_employee_id ?? null,
    head: department.head
      ? {
          id: department.head.id,
          employee_code: department.head.employeeCode || department.head.employee_code,
          name: department.head.user ? department.head.user.name : null,
        }
      : undefined,
    employees_count:
      typeof department._count?.employees === 'number'
        ? department._count.employees
        : undefined,
    created_at: formatDateTime(department.createdAt || department.created_at),
  };
}

function employeeResource(employee) {
  if (!employee) return null;
  return {
    id: employee.id,
    employee_code: employee.employeeCode || employee.employee_code,
    phone: employee.phone,
    address: employee.address,
    designation: employee.designation,
    date_of_birth: formatDate(employee.dateOfBirth || employee.date_of_birth),
    join_date: formatDate(employee.joinDate || employee.join_date),
    salary: formatDecimal(employee.salary),
    status: employee.status,
    department_id: employee.departmentId ?? employee.department_id ?? null,
    manager_id: employee.managerId ?? employee.manager_id ?? null,
    user: employee.user ? userResource(employee.user) : undefined,
    department: employee.department
      ? {
          id: employee.department.id,
          name: employee.department.name,
          code: employee.department.code,
        }
      : undefined,
    manager: employee.manager
      ? {
          id: employee.manager.id,
          employee_code: employee.manager.employeeCode || employee.manager.employee_code,
          name: employee.manager.user ? employee.manager.user.name : null,
        }
      : undefined,
  };
}

function attendanceResource(attendance) {
  if (!attendance) return null;
  return {
    id: attendance.id,
    employee_id: attendance.employeeId ?? attendance.employee_id,
    date: formatDate(attendance.date),
    check_in: attendance.checkIn ?? attendance.check_in ?? null,
    check_out: attendance.checkOut ?? attendance.check_out ?? null,
    status: attendance.status,
    notes: attendance.notes,
    employee: attendance.employee
      ? {
          id: attendance.employee.id,
          employee_code: attendance.employee.employeeCode || attendance.employee.employee_code,
          name: attendance.employee.user ? attendance.employee.user.name : null,
        }
      : undefined,
  };
}

function leaveRequestResource(leave) {
  if (!leave) return null;
  return {
    id: leave.id,
    employee_id: leave.employeeId ?? leave.employee_id,
    start_date: formatDate(leave.startDate || leave.start_date),
    end_date: formatDate(leave.endDate || leave.end_date),
    type: leave.type,
    reason: leave.reason,
    status: leave.status,
    approved_by: leave.approvedBy ?? leave.approved_by ?? null,
    approved_at: formatDateTime(leave.approvedAt || leave.approved_at),
    rejection_reason: leave.rejectionReason ?? leave.rejection_reason ?? null,
    employee: leave.employee
      ? {
          id: leave.employee.id,
          employee_code: leave.employee.employeeCode || leave.employee.employee_code,
          name: leave.employee.user ? leave.employee.user.name : null,
        }
      : undefined,
    approver: leave.approver ? userResource(leave.approver) : undefined,
  };
}

function payrollResource(payroll) {
  if (!payroll) return null;
  return {
    id: payroll.id,
    employee_id: payroll.employeeId ?? payroll.employee_id,
    month_year: payroll.monthYear || payroll.month_year,
    basic_salary: formatDecimal(payroll.basicSalary ?? payroll.basic_salary),
    allowances: formatDecimal(payroll.allowances),
    deductions: formatDecimal(payroll.deductions),
    net_salary: formatDecimal(payroll.netSalary ?? payroll.net_salary),
    status: payroll.status,
    paid_at: formatDateTime(payroll.paidAt ?? payroll.paid_at),
    employee: payroll.employee
      ? {
          id: payroll.employee.id,
          employee_code: payroll.employee.employeeCode || payroll.employee.employee_code,
          name: payroll.employee.user ? payroll.employee.user.name : null,
        }
      : undefined,
  };
}

module.exports = {
  userResource,
  departmentResource,
  employeeResource,
  attendanceResource,
  leaveRequestResource,
  payrollResource,
};
