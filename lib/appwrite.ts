import { Account, Client, ID, Permission, Query, Role, TablesDB } from "appwrite";

export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "pace";
export const tasksTableId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_TABLE_ID ?? "tasks";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "pace";

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export { ID, Permission, Query, Role };

export function getAppwriteServices() {
  return { account, tablesDB };
}
