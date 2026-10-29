import axios from "axios";

// The API's self-signed cert is trusted via NODE_EXTRA_CA_CERTS in vitest.config.ts.
export const api = axios.create({
  baseURL: process.env.API_URL ?? "https://127.0.0.1:3000",
  // Tests assert on 4xx/5xx statuses, so axios must not throw on them.
  validateStatus: () => true,
});
