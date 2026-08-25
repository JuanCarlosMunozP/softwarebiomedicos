import { api } from "@/lib/api";
import type { LoginRequest, LoginResponse, Usuario } from "@/types/auth";

export const authService = {
  async login(data: LoginRequest) {
    const res = await api.post<LoginResponse>("/auth/token/", data);
    return res.data;
  },
  async me() {
    const res = await api.get<Usuario>("/users/me/");
    return res.data;
  },
  async logout() {
    // Invalida el refresh token en el backend (blacklist) y borra las
    // cookies de sesión. Se ignora cualquier error: el logout local
    // (limpiar estado en memoria) debe funcionar igual aunque el request
    // falle (p. ej. sin conexión).
    await api.post("/auth/token/blacklist/").catch(() => undefined);
  },
};
