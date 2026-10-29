import { UUID } from "node:crypto";

export interface User {
    ID: UUID;
    Name: string;
    LastName: string;
    Email: string;
    Password: string;
    CreatedAt: string;
    UpdatedAt: string;
}