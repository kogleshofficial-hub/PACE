import { Account, Client, ID, Permission, Query, Role, TablesDB } from "appwrite";

function readPublicEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  return value.replace(/^(["'])(.*)\1$/, "$2").trim();
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
export const tablesDB = new TablesDB(client);
export { ID, Permission, Query, Role };

export function getAppwriteServices() {
  return { account, tablesDB };
}
