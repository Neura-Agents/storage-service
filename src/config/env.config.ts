import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const ENV = {
    PORT: process.env.PORT || 3003,
    NODE_ENV: process.env.NODE_ENV || 'development',
    STORAGE: {
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
        R2_ENDPOINT: process.env.R2_ENDPOINT || '',
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'neura-agents-storage',
    },
    DB: {
        HOST: process.env.DB_HOST || 'localhost',
        PORT: Number(process.env.DB_PORT) || 5432,
        USER: process.env.DB_USER || 'postgres',
        PASSWORD: process.env.DB_PASSWORD || 'postgres',
        NAME: process.env.DB_NAME || 'neura-agents-platform',
        SCHEMA: process.env.DB_SCHEMA || 'public',
    },
    LOG: {
        LEVEL: process.env.LOG_LEVEL || 'info',
    },
    KEYCLOAK: {
        ISSUER_URL: process.env.KEYCLOAK_ISSUER_URL || 'http://keycloak:8080/realms/agentic-ai',
        PUBLIC_ISSUER_URL: process.env.KEYCLOAK_PUBLIC_ISSUER_URL || 'http://localhost:8081/realms/agentic-ai',
        REALM: process.env.VITE_KEYCLOAK_REALM || 'agentic-ai'
    }
};
