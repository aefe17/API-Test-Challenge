import axios from "axios";

export const api = axios.create({
  baseURL: process.env.API_URL ?? "https://127.0.0.1:3000",
  validateStatus: () => true,
});
