# Users API – Test Cases

Test cases for every endpoint of the local Users API, with the expected status codes and error messages.

The API runs at `https://127.0.0.1:3000` with a self-signed certificate (`certs/localhost.crt`). Tests must use HTTPS and trust that certificate.

## Conventions

Every successful user response must:

- have an `ID` that is a lowercase UUID
- have `CreatedAt` and `UpdatedAt` as short dates (`YYYY-MM-DD`)
- **not** include `Password`

Validation errors return `400` with `{ "errors": [...] }`. Other errors return `{ "error": "..." }`.

Every test that creates a user deletes it afterwards, so runs don't leave data behind.

## `GET /health`

| Case         | Expected                    |
| ------------ | --------------------------- |
| Health check | `200`, `{ "status": "ok" }` |

## `POST /users` – Create

| Case                                                   | Expected                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| Valid payload                                          | `201`, `Location: /users/{ID}`, body matches the data sent     |
| Name with surrounding spaces (`'  Ada  '`)             | `201`, stored as `'Ada'` (trimmed)                             |
| Each field missing (Name, LastName, Email, Password)   | `400`, `errors` contains `"<Field> is required"`               |
| Field is `''` or `'   '`                               | `400`, `"<Field> must be a non-empty string"`                  |
| Field is not a string (`123`, `null`, `true`)          | `400`, `"<Field> must be a non-empty string"`                  |
| Invalid email (`'abc'`, `'a@b'`, `'a b@c.d'`)          | `400`, `"Email must be a valid email address"`                 |
| Password of 7 characters                               | `400`, `"Password must be at least 8 characters"`              |
| Password of exactly 8 characters (boundary)            | `201`                                                          |
| Several invalid fields at once                         | `400`, `errors` lists every problem                            |
| Duplicate email                                        | `409`                                                          |
| Duplicate email in different case (`ADA@...`)          | `409` (emails are compared ignoring case)                      |
| Body is a JSON array (`[]`)                            | `400`, `"Request body must be a JSON object"`                  |
| Malformed JSON (`{"Name":` with `application/json`)    | `400`, `"Request body is not valid JSON"`                      |

## `GET /users` – List

| Case                       | Expected                                     |
| -------------------------- | -------------------------------------------- |
| List users                 | `200`, array                                 |
| A newly created user       | appears in the list (found by `ID`)          |
| Every item                 | has no `Password` field                      |
| Order                      | users are returned in creation order         |

## `GET /users/:id` – Read one

| Case                                          | Expected                                   |
| --------------------------------------------- | ------------------------------------------ |
| Existing ID                                   | `200`, matches the created user            |
| Same ID in uppercase                          | `200` (IDs are lowercased before lookup)   |
| Valid UUID that doesn't exist                 | `404`                                      |
| Not a UUID (`abc`, `123`)                     | `400`, `"ID must be a valid UUID"`         |

## `PUT /users/:id` – Replace

| Case                                                   | Expected                                        |
| ------------------------------------------------------ | ----------------------------------------------- |
| All four fields                                        | `200`, fields updated, `CreatedAt` unchanged    |
| `GET` the same ID afterwards                           | returns the new values                          |
| One field missing                                      | `400`, `"<Field> is required"`                  |
| Empty field, invalid email or short password           | `400` (same rules as `POST`)                    |
| Email that belongs to another user                     | `409`                                           |
| The user's own current email                           | `200` (not a conflict)                          |
| Valid UUID that doesn't exist                          | `404`                                           |
| Not a UUID                                             | `400`                                           |

## `PATCH /users/:id` – Partial update

| Case                                  | Expected                                                              |
| ------------------------------------- | --------------------------------------------------------------------- |
| Only `Name`                           | `200`, `Name` changed, other fields unchanged                         |
| Only `Password`                       | `200`, response still has no `Password`                               |
| Empty body `{}`                       | `400`, `"Provide at least one of: Name, LastName, Email, Password"`  |
| Invalid value (`Email: 'bad'`)        | `400`                                                                 |
| Only unknown fields (`{ "Foo": 1 }`)  | `400` (unknown fields are ignored, so the body counts as empty)       |
| Email that belongs to another user    | `409`                                                                 |
| Valid UUID that doesn't exist         | `404`                                                                 |
| Not a UUID                            | `400`                                                                 |

## `DELETE /users/:id` – Delete

| Case                           | Expected            |
| ------------------------------ | ------------------- |
| Existing user                  | `204`, empty body   |
| `GET` the same ID afterwards   | `404`               |
| Delete the same ID again       | `404`               |
| Valid UUID that doesn't exist  | `404`               |
| Not a UUID                     | `400`               |

## Unknown routes

| Case                                 | Expected                                    |
| ------------------------------------ | ------------------------------------------- |
| `GET /nope`, `POST /users/x/y`       | `404`, `{ "error": "Cannot GET /nope" }`    |
