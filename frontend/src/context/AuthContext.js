import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("hrms_token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        const me = await apiRequest("/auth/me", {}, token);
        setUser(me.data ?? me);
      } catch (error) {
        setToken("");
        setUser(null);
        localStorage.removeItem("hrms_token");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      async login(payload) {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setToken(data.token);
        setUser(data.user?.data ?? data.user);
        localStorage.setItem("hrms_token", data.token);
      },
      async logout() {
        try {
          if (token) {
            await apiRequest("/auth/logout", { method: "POST" }, token);
          }
        } finally {
          setToken("");
          setUser(null);
          localStorage.removeItem("hrms_token");
        }
      },
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
