import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "../config/env.config";
import logger from "../config/logger";
import { pool } from "../config/db.config";
import { FileMetadata } from "../types/storage";

class StorageService {
    private client: S3Client;

    constructor() {
        this.client = new S3Client({
            region: "auto",
            endpoint: ENV.STORAGE.R2_ENDPOINT,
            credentials: {
                accessKeyId: ENV.STORAGE.R2_ACCESS_KEY_ID,
                secretAccessKey: ENV.STORAGE.R2_SECRET_ACCESS_KEY,
            },
        });
    }

    async upload(key: string, body: Buffer, contentType: string, userId: string, fileName: string) {
        try {
            const command = new PutObjectCommand({
                Bucket: ENV.STORAGE.R2_BUCKET_NAME,
                Key: key,
                Body: body,
                ContentType: contentType,
            });

            await this.client.send(command);
            logger.info({ key }, 'File uploaded successfully to R2');
            
            const fileUrl = `${ENV.STORAGE.R2_ENDPOINT}/${ENV.STORAGE.R2_BUCKET_NAME}/${key}`;
            
            // Save to database
            const metadata = await this.saveMetadata({
                userId,
                fileName,
                storageKey: key,
                url: fileUrl,
                size: body.length,
                mimeType: contentType,
            });

            return {
                key,
                url: fileUrl,
                metadata
            };
        } catch (error) {
            logger.error({ error, key }, 'Error uploading file and saving metadata');
            throw error;
        }
    }

    private async saveMetadata(data: FileMetadata) {
        try {
            const query = `
                INSERT INTO storage_metadata (
                    user_id, file_name, storage_key, url, size, mime_type, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const values = [
                data.userId,
                data.fileName,
                data.storageKey,
                data.url,
                data.size,
                data.mimeType,
                JSON.stringify(data.metadata || {})
            ];

            const result = await pool.query(query, values);
            return result.rows[0] as FileMetadata;
        } catch (error) {
            logger.error({ error, storageKey: data.storageKey }, 'Failed to save file metadata to database');
            throw error;
        }
    }

    async generatePresignedUrl(key: string, expiresIn: number = 3600) {
        try {
            const command = new GetObjectCommand({
                Bucket: ENV.STORAGE.R2_BUCKET_NAME,
                Key: key,
            });

            const url = await getSignedUrl(this.client, command, { expiresIn });
            return url;
        } catch (error) {
            logger.error({ error, key }, 'Error generating presigned URL');
            throw error;
        }
    }

    async list(filters: { id?: string; userId?: string; fileName?: string; mimeType?: string }) {
        try {
            let query = 'SELECT * FROM storage_metadata WHERE 1=1';
            const values: any[] = [];
            let counter = 1;

            if (filters.id) {
                query += ` AND id = $${counter++}`;
                values.push(filters.id);
            }
            if (filters.userId) {
                query += ` AND user_id = $${counter++}`;
                values.push(filters.userId);
            }
            if (filters.fileName) {
                query += ` AND file_name ILIKE $${counter++}`;
                values.push(`%${filters.fileName}%`);
            }
            if (filters.mimeType) {
                query += ` AND mime_type = $${counter++}`;
                values.push(filters.mimeType);
            }

            query += ' ORDER BY created_at DESC';

            const result = await pool.query(query, values);
            return result.rows as FileMetadata[];
        } catch (error) {
            logger.error({ error, filters }, 'Failed to list file metadata');
            throw error;
        }
    }

    async delete(ids: string[]) {
        try {
            if (!ids || ids.length === 0) return { success: true, count: 0 };

            // 1. Get storage keys for these IDs
            const result = await pool.query(
                `SELECT storage_key FROM storage_metadata WHERE id = ANY($1)`,
                [ids]
            );
            
            const storageKeys = result.rows.map(row => row.storage_key);
            
            if (storageKeys.length > 0) {
                // 2. Delete from R2
                const deleteParams = {
                    Bucket: ENV.STORAGE.R2_BUCKET_NAME,
                    Delete: {
                        Objects: storageKeys.map(key => ({ Key: key })),
                        Quiet: false
                    }
                };
                
                const command = new DeleteObjectsCommand(deleteParams);
                const deleteResult = await this.client.send(command);
                
                if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                    logger.warn({ errors: deleteResult.Errors }, 'Some objects failed to delete from R2');
                } else {
                    logger.info({ count: storageKeys.length }, 'Successfully deleted objects from R2');
                }
            }

            // 3. Delete from DB
            const deleteResultDb = await pool.query(
                'DELETE FROM storage_metadata WHERE id = ANY($1) RETURNING id',
                [ids]
            );

            return {
                success: true,
                deletedCount: deleteResultDb.rowCount || 0,
                ids: deleteResultDb.rows.map(r => r.id)
            };
        } catch (error) {
            logger.error({ error, ids }, 'Failed to delete files');
            throw error;
        }
    }
}

export const storageService = new StorageService();
