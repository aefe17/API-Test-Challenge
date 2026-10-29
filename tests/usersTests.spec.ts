import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildUser,
  createUser,
  deleteCreatedUsers,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  type User,
} from "./Models/userModel";

afterAll(deleteCreatedUsers);

//CRUD Tests
//CREATE [POST]
describe("POST /users", () => {
  it("should create the user when the payload is valid", async () => {
    const user = buildUser();

    const res = await createUser(user);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/users/${res.data.ID}`);
    expect(res.data).toMatchObject({
      ID: user.ID,
      Name: user.Name,
      LastName: user.LastName,
      Email: user.Email,
    });
    expect(res.data).not.toHaveProperty("Password");
  });

  it("should reject the user when a required field is empty", async () => {
    const user = buildUser({ Name: "" });
    const res = await createUser(user);

    expect(res.status).toBe(400);
    expect(res.data.errors).toEqual(["Name must be a non-empty string"]);
  });

  it("should reject the user when the email is invalid", async () => {
    const user = buildUser({ Email: "a b@c.d" });
    const res = await createUser(user);

    expect(res.status).toBe(400);
    expect(res.data.errors).toEqual(["Email must be a valid email address"]);
  });

  it("should reject the user when the password is shorter than 8 characters", async () => {
    const user = buildUser({ Password: "1234567" });
    const res = await createUser(user);

    expect(res.status).toBe(400);
    expect(res.data.errors).toEqual(["Password must be at least 8 characters"]);
  });

  it("should create the user when the password is exactly 8 characters", async () => {
    const user = buildUser({ Password: "12345678" });
    const res = await createUser(user);

    expect(res.status).toBe(201);
  });

  it("should reject the request when the body is an array", async () => {
    const user = [buildUser()];
    const res = await createUser(user);

    expect(res.status).toBe(400);
    expect(res.data.errors).toEqual(["Request body must be a JSON object"]);
  });

  it("should reject the user when the email is already registered", async () => {
    const existing = buildUser();
    await createUser(existing);

    const res = await createUser(buildUser({ Email: existing.Email }));

    expect(res.status).toBe(409);
  });
});
// RETRIEVE [GET]
describe("GET /users", () => {
  it("should return a list of users", async () => {
    const res = await getUsers();

    expect(res.status).toBe(200);
    expect(res.data).not.toHaveProperty("Password");
  });

  it("should return newly created user", async () => {
    const user = buildUser();
    await createUser(user);
    const res = await getUser(user.ID!);

    expect(res.status).toBe(200);
    expect(res.data.ID).toBe(user.ID);
  });
});
// UPDATE [PUT]
describe("PUT /users/{id}", () => {
  let existing: User;

  beforeEach(async () => {
    existing = buildUser();
    await createUser(existing);
  });

  it("should update an specific user", async () => {
    const user = buildUser();
    const res = await updateUser(existing.ID!, user);

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      Name: user.Name,
      LastName: user.LastName,
      Email: user.Email,
    });
  });

  it("should update an specific user and retrieves the user with the new values", async () => {
    const updated = buildUser();
    await updateUser(existing.ID!, updated);
    const res = await getUser(existing.ID!);

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      Name: updated.Name,
      LastName: updated.LastName,
      Email: updated.Email,
    });
  });

  it("should not update with missing field", async () => {
    const user = buildUser({ Name: "" });
    const res = await updateUser(existing.ID!, user);

    expect(res.status).toBe(400);
    expect(res.data.errors).toEqual(["Name must be a non-empty string"]);
  });

  it("should not update with a similar email", async () => {
    const other = buildUser();
    await createUser(other);

    // Emails are unique regardless of case.
    const user = buildUser({ Email: other.Email.toUpperCase() });
    const res = await updateUser(existing.ID!, user);

    expect(res.status).toBe(409);
    expect(res.data.error).toBe(
      `A user with email "${user.Email}" already exists`,
    );
  });

  it("should not update with no existing UUID", async () => {
    const UUID = randomUUID();
    const user = buildUser();
    const res = await updateUser(UUID, user);

    expect(res.status).toBe(404);
    expect(res.data.error).toBe(`User ${UUID} not found`);
  });

  it("should not update with a no valid UUID", async () => {
    const user = buildUser();
    const res = await updateUser("1234", user);

    expect(res.status).toBe(400);
    expect(res.data.error).toBe("ID must be a valid UUID");
  });
});
// DELETE [DELETE]
describe("DELETE /users/{id}", () => {
  it("should delete an user", async () => {
    const newUser = buildUser();
    await createUser(newUser);
    const id = newUser.ID!;

    const res = await deleteUser(id);
    const get = await getUser(id);

    expect(res.status).toBe(204);
    expect(get.status).toBe(404);
  });

  it("should not delete because it is not a valid UUID", async () => {
    const res = await deleteUser("123456");

    expect(res.data.error).toBe("ID must be a valid UUID");
  });

  it("should try to delete the same user", async () => {
    const newUser = buildUser();
    await createUser(newUser);
    const id = newUser.ID!;

    await deleteUser(id);
    const res = await deleteUser(id);

    expect(res.status).toBe(404);
  });
});
