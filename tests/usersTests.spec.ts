import { describe, expect, test, beforeAll, afterAll } from "vitest";
import axios from "axios";
import { it } from "vitest";

let api = axios.create({ baseURL: process.env.API_URL });

//Setup
beforeAll(() => {});

//Teardown
afterAll(() => {});


//CRUD Tests

//Create [POSTS]

describe('User Creation Tests [POSTS]'); {
    it('Creates User', () => {
        console.log("Hello World!")
    });
}