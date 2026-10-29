import { faker } from "@faker-js/faker";
import { AxiosResponse } from "axios";
import { UUID } from "crypto";
import { api } from "../api/api";

export interface User {
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

function buildUser(overrides: Partial<User> = {}): User {
  const Name = faker.person.firstName();
  const LastName = faker.person.lastName();
  return {
    Name,
    LastName,
    Email: `${faker.string.alphanumeric(8).toLowerCase()}
            .${faker.internet.email({
              firstName: Name,
              lastName: LastName,
              provider: "example.com",
            })}`,
    Password: faker.internet.password({ length: 12 }),
    ...overrides,
  };
}

export async function createUser(body: Payload = buildUser()): Promise<UserApiResponse> {
  const res = await api.post("/users", body);
  if (res.status === 201) return res;
  return res;
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
export async function deleteUser(id: string): Promise<UserApiResponse | ErrorResponse> {
  const res = await api.delete(`/users/${id}`)
  return res;
}
