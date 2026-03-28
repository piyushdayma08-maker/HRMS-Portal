import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function EmployeesPage() {
  const { token, user } = useAuth();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    employee_code: "",
    designation: "",
    department_id: "",
    join_date: "",
    salary: "",
    status: "active",
  });

  const loadData = useCallback(async () => {
    try {
      const [employeeResponse, departmentResponse] = await Promise.all([
        apiRequest("/employees", {}, token),
        apiRequest("/departments", {}, token),
      ]);
      setEmployees(employeeResponse.data || []);
      setDepartments(departmentResponse.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await apiRequest(
        "/employees",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            password: "password123",
            role: "employee",
          }),
        },
        token
      );
      setForm({
        name: "",
        email: "",
        employee_code: "",
        designation: "",
        department_id: "",
        join_date: "",
        salary: "",
        status: "active",
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h2>Employees</h2>
      {error ? <p className="error">{error}</p> : null}
      {canManage ? (
        <form className="card inline-form" onSubmit={handleSubmit}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            placeholder="Employee Code"
            value={form.employee_code}
            onChange={(e) => setForm((prev) => ({ ...prev, employee_code: e.target.value }))}
            required
          />
          <input
            placeholder="Designation"
            value={form.designation}
            onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
            required
          />
          <select
            value={form.department_id}
            onChange={(e) => setForm((prev) => ({ ...prev, department_id: e.target.value }))}
          >
            <option value="">Department</option>
            {departments.map((dept) => (
              <option value={dept.id} key={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.join_date}
            onChange={(e) => setForm((prev) => ({ ...prev, join_date: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder="Salary"
            value={form.salary}
            onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
            required
          />
          <button className="btn" type="submit">
            Add Employee
          </button>
        </form>
      ) : null}
      <article className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Code</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.user?.name}</td>
                <td>{employee.user?.email}</td>
                <td>{employee.employee_code}</td>
                <td>{employee.department?.name || "-"}</td>
                <td>{employee.designation}</td>
                <td>{employee.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
