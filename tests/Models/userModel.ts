import { faker } from "@faker-js/faker";
import { AxiosResponse } from "axios";
import { UUID } from "crypto";
import { api } from "../api/api";

export interface User {
  ID?: UUID;
  Name: string;
  LastName: string;
  Email: string;
  Password: string;
}
export interface UserResponse extends Omit<User, "Password"> {
  ID: UUID;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ErrorResponse {
  error?: string;
  errors?: string[];
}

export type UserApiResponse = AxiosResponse<UserResponse & ErrorResponse>;

type Payload = Partial<User> | Object;

export function buildUser(overrides: Partial<User> = {}): User {
  const Name = faker.person.firstName();
  const LastName = faker.person.lastName();
  return {
    Name,
    LastName,
    Email: `${faker.string.alphanumeric(8).toLowerCase()}.${faker.internet.email({
      firstName: Name,
      lastName: LastName,
      provider: "example.com",
    })}`,
    Password: faker.internet.password({ length: 12 }),
    ...overrides,
  };
}

const createdIds = new Set<string>();

export async function createUser(body: Payload = buildUser()): Promise<UserApiResponse> {
  const res = await api.post("/users", body);
  if (res.status === 201) {
    createdIds.add(res.data.ID);
    if (!Array.isArray(body)) (body as Partial<User>).ID = res.data.ID;
  }
  return res;
}

export async function deleteCreatedUsers(): Promise<void> {
  await Promise.all([...createdIds].map((id) => api.delete(`/users/${id}`)));
  createdIds.clear();
}

export async function getUsers(): Promise<UserApiResponse> {
  return api.get("/users")
}
export async function getUser(id: string): Promise<UserApiResponse> {
  return api.get(`/users/${id}`)
}
export async function updateUser(id: string, body: Payload): Promise<UserApiResponse> {
  return api.put(`/users/${id}`, body);
}
export async function deleteUser(id: string): Promise<UserApiResponse> {
  return api.delete(`/users/${id}`);
}
