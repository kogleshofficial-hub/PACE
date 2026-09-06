import { Account, Client, ID, Permission, Query, Role, TablesDB } from "appwrite";

export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "pace";
export const tasksTableId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_TABLE_ID ?? "tasks";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const client = endpoint && projectId
  ? new Client().setEndpoint(endpoint).setProject(projectId)
  : null;

export const account = client ? new Account(client) : null;
export const tablesDB = client ? new TablesDB(client) : null;
export { ID, Permission, Query, Role };

export function getAppwriteServices() {
  return { account, tablesDB };
}
