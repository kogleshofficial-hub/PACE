import { Account, Client, ID, Permission, Query, Role, TablesDB } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "pace";
const tasksTableId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_TABLE_ID ?? "tasks";

if (!endpoint || !projectId) {
  throw new Error("PACE Appwrite configuration is missing. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export { databaseId, tasksTableId, ID, Permission, Query, Role };
