import type { User } from "@muzammil-pos/types";
import type {
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  ToggleUserStatusInput,
} from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export const usersApi = {
  async list(): Promise<User[]> {
    const res = await apiRequest<{ users: User[] }>("/users");
    return res.users;
  },

  async create(input: CreateUserInput): Promise<User> {
    const res = await apiRequest<{ user: User }>("/users", { method: "POST", body: input });
    return res.user;
  },

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const res = await apiRequest<{ user: User }>(`/users/${id}`, { method: "PATCH", body: input });
    return res.user;
  },

  async changePassword(id: string, input: ChangePasswordInput): Promise<void> {
    await apiRequest(`/users/${id}/password`, { method: "PATCH", body: input });
  },

  async setStatus(id: string, status: ToggleUserStatusInput["status"]): Promise<User> {
    const res = await apiRequest<{ user: User }>(`/users/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return res.user;
  },

  async remove(id: string): Promise<void> {
    await apiRequest(`/users/${id}`, { method: "DELETE" });
  },
};