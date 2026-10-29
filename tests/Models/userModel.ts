import { UUID } from "node:crypto";

export class User {
    ID: UUID;
    Name: string;
    LastName: string;
    Email: string;
    Password: string;

    constructor(id: UUID, name: string, lastName: string, email: string, password: string, createdAt: string, updatedAt: string ) {
        this.ID = id
        this.Name = name
        this.LastName = lastName
        this.Email = email
        this.Password = password
    }

    static create(name: string, lastName: string, email: string, password: string ) {
        return new User(name, lastName, email, password)
    }
}