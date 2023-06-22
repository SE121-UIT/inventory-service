import { config } from 'dotenv';
config();

export const PG_USER = process.env.PG_USER!;
export const PG_PASSWORD = process.env.PG_PASSWORD!;
export const PG_HOST = process.env.PG_HOST!;
export const PG_PORT = process.env.PG_PORT!;
export const PG_DATABASE = process.env.PG_DATABASE!;
export const EVENT_STORE_DB_URL = process.env.EVENT_STORE_DB_URL!;
export const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL!;
export const EXCHANGE_NAME = process.env.EXCHANGE_NAME!;
export const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE!;
