# API Test Challenge

API test automation written in TypeScript, using [Vitest](https://vitest.dev/) as the test runner and [Axios](https://axios-http.com/) as the HTTP client.

## API under test


## Requirements

- Node.js 22+
- pnpm 12 (`npm install -g pnpm`)

## Setup

```sh
pnpm install
```

Copy `.env.example` to `.env` and set your TCG API key:

```sh
API_KEY=your-api-key
```

## Usage

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `pnpm test`       | Run the test suite once         |
| `pnpm test:watch` | Run tests in watch mode         |
| `pnpm typecheck`  | Type-check the project with tsc |

## Project structure

```
src/     Shared code (API clients, helpers)
tests/   Test files (*.test.ts)
```
