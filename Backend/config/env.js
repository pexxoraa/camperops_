import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '.env') });

export const env = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || './data/polarops.sqlite',
  authSecret: process.env.AUTH_SECRET || '',
  weatherApiUrl: process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
  operationsFeedUrl: process.env.OPERATIONS_FEED_URL || '',
};

if (!env.authSecret) {
  throw new Error('AUTH_SECRET is required');
}
