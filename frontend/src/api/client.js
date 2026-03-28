const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

export async function apiRequest(path, options = {}, token) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error("Network request failed.");
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      data?.message ||
      (data?.errors
        ? Object.values(data.errors).flat().join(", ")
        : `HTTP ${response.status} ${response.statusText}`);
    throw new Error(message);
  }

  if (!isJson) {
    throw new Error(`Unexpected response (expected JSON, got "${contentType || "unknown"}").`);
  }

  return data;
}
