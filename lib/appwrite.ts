import { Account, Client, ID, Permission, Query, Role, TablesDB } from "appwrite";

function readPublicEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  return value.replace(/^(\[\"'])(.*)\1$/, "$2").trim();
}

export const databaseId = readPublicEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID", "pace");
export const tasksTableId = readPublicEnv("NEXT_PUBLIC_APPWRITE_TASKS_TABLE_ID", "tasks");

const endpoint = readPublicEnv(
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "https://sgp.cloud.appwrite.io/v1"
).replace(/\/$/, "");
const projectId = readPublicEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "pace");

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);

function normalizeDateKey(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return value;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

const rawTablesDB = new TablesDB(client);

export const tablesDB = new Proxy(rawTablesDB, {
  get(target, property, receiver) {
    if (property !== "listRows") return Reflect.get(target, property, receiver);

    return async (...args: any[]) => {
      const result = await (target.listRows as (...params: any[]) => Promise<any>)(...args);
      return {
        ...result,
        rows: result.rows.map((row: any) => ({
          ...row,
          ...(Object.prototype.hasOwnProperty.call(row, "dueDate")
            ? { dueDate: normalizeDateKey(row.dueDate) }
            : {}),
        })),
      };
    };
  },
}) as TablesDB;

export { ID, Permission, Query, Role };

export function getAppwriteServices() {
  return { account, tablesDB };
}
