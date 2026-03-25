import { Pool } from 'pg';
import { ENV } from './env.config';
import logger from './logger';

export const pool = new Pool({
    host: ENV.DB.HOST,
    port: ENV.DB.PORT,
    user: ENV.DB.USER,
    password: ENV.DB.PASSWORD,
    database: ENV.DB.NAME,
});

export const initDb = async () => {
    try {
        // We'll use UUIDs for file metadata
        await pool.query(`
            CREATE TABLE IF NOT EXISTS storage_metadata (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                storage_key VARCHAR(255) UNIQUE NOT NULL,
                url TEXT NOT NULL,
                size BIGINT NOT NULL,
                mime_type VARCHAR(100),
                metadata JSONB DEFAULT '{}',
                is_public BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_storage_metadata_user_id ON storage_metadata(user_id);
        `);
        logger.info('Storage database initialized successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to initialize storage database');
        throw error;
    }
};
