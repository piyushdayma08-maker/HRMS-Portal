import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DepartmentsPage() {
  const { token, user } = useAuth();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const loadData = useCallback(async () => {
    try {
      setError("");
      const response = await apiRequest("/departments", {}, token);
      setItems(response.data || []);
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
      await apiRequest("/departments", { method: "POST", body: JSON.stringify(form) }, token);
      setForm({ name: "", code: "", description: "" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h2>Departments</h2>
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
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            required
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button className="btn" type="submit">
            Add Department
          </button>
        </form>
      ) : null}
      <article className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Description</th>
              <th>Employees</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.code}</td>
                <td>{item.description || "-"}</td>
                <td>{item.employees_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
