import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PayrollPage() {
  const { token, user } = useAuth();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    month_year: "",
    basic_salary: "",
    allowances: "0",
    deductions: "0",
  });

  const loadData = useCallback(async () => {
    try {
      const [payrollResponse, employeeResponse] = await Promise.all([
        apiRequest("/payrolls", {}, token),
        apiRequest("/employees", {}, token),
      ]);
      setPayrolls(payrollResponse.data || []);
      setEmployees(employeeResponse.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function generatePayroll(event) {
    event.preventDefault();
    try {
      await apiRequest("/payrolls", { method: "POST", body: JSON.stringify(form) }, token);
      setForm({ employee_id: "", month_year: "", basic_salary: "", allowances: "0", deductions: "0" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markPaid(id) {
    try {
      await apiRequest(`/payrolls/${id}/mark-paid`, { method: "PATCH" }, token);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h2>Payroll</h2>
      {error ? <p className="error">{error}</p> : null}
      {canManage ? (
        <form className="card inline-form" onSubmit={generatePayroll}>
          <select
            value={form.employee_id}
            onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
            required
          >
            <option value="">Employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.user?.name}
              </option>
            ))}
          </select>
          <input
            placeholder="YYYY-MM"
            value={form.month_year}
            onChange={(e) => setForm((prev) => ({ ...prev, month_year: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder="Basic"
            value={form.basic_salary}
            onChange={(e) => setForm((prev) => ({ ...prev, basic_salary: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder="Allowances"
            value={form.allowances}
            onChange={(e) => setForm((prev) => ({ ...prev, allowances: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Deductions"
            value={form.deductions}
            onChange={(e) => setForm((prev) => ({ ...prev, deductions: e.target.value }))}
          />
          <button className="btn" type="submit">
            Generate Payroll
          </button>
        </form>
      ) : null}
      <article className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Month</th>
              <th>Net Salary</th>
              <th>Status</th>
              {canManage ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {payrolls.map((item) => (
              <tr key={item.id}>
                <td>{item.employee?.name}</td>
                <td>{item.month_year}</td>
                <td>{item.net_salary}</td>
                <td>{item.status}</td>
                {canManage ? (
                  <td>
                    <button
                      className="btn btn-small"
                      type="button"
                      onClick={() => markPaid(item.id)}
                      disabled={item.status === "paid"}
                    >
                      Mark Paid
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
