import { render, screen } from "@testing-library/react";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

test("renders login title for unauthenticated users", async () => {
  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  const title = await screen.findByText(/HRMS Login/i);
  expect(title).toBeInTheDocument();
});
