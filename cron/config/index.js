/*
 * Read values from .env. This is somewhat a duplicate of /src/config/index.js
 * but I try to keep the concerns separated for now since we running the disk
 * management on its on process.
 */
import { config } from 'dotenv';
config();

export const queueDir = process.env.QUEUE_DIR;
export const archiveDir = process.env.ARCHIVE_DIR;