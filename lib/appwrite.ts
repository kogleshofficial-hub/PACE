import { Account, Client, ID, Permission, Query, Role, TablesDB } from "appwrite";

export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "pace";
export const tasksTableId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_TABLE_ID ?? "tasks";

function createClient() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  if (!endpoint || !projectId) {
    throw new Error("PACE Appwrite configuration is missing. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.");
  }

  return new Client().setEndpoint(endpoint).setProject(projectId);
}

const client = typeof window === "undefined" ? null : createClient();

export const account = client ? new Account(client) : null;
export const tablesDB = client ? new TablesDB(client) : null;
export { ID, Permission, Query, Role };

export function getAppwriteServices() {
  if (!account || !tablesDB) {
    throw new Error("Appwrite services are only available in the browser.");
  }

  return { account, tablesDB };
}
