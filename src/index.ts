import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { ENV } from './config/env.config';
import logger from './config/logger';
import { storageService } from './services/storage.service';
import { initDb, pool } from './config/db.config';
import { authenticate, AuthenticatedRequest } from './middlewares/auth.middleware';

const app = express();
const upload = multer();

// Middleware
app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
    logger.info({ 
        method: req.method, 
        url: req.url,
        ip: req.ip 
    }, 'Incoming Request');
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'storage-service', version: '1.0.0' });
});

// Upload route - requires authentication
app.post('/backend/api/storage/upload', authenticate, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Extract metadata from request
        const userId = req.user?.id || 'anonymous';
        const fileName = req.body.fileName || file.originalname;

        const key = `${Date.now()}-${fileName}`;
        const result = await storageService.upload(key, file.buffer, file.mimetype, userId, fileName);

        res.json({ 
            success: true, 
            key: result.key, 
            url: result.url,
            metadata: result.metadata
        });
    } catch (error) {
        logger.error({ error }, 'Failed to upload user file');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// View route - generates presigned URL and redirects
app.get('/backend/api/storage/view/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        
        // Fetch metadata from DB
        const result = await pool.query('SELECT storage_key FROM storage_metadata WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const { storage_key } = result.rows[0];
        
        // Generate presigned URL (valid for 1 hour)
        const url = await storageService.generatePresignedUrl(storage_key, 3600);
        
        // Redirect the browser to the R2 URL
        res.redirect(url);
    } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to generate view URL');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// List documents with filters
app.get('/backend/api/storage/list', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const { id, userId, fileName, type } = req.query;
        
        const documents = await storageService.list({
            id: typeof id === 'string' ? id : undefined,
            userId: typeof userId === 'string' ? userId : undefined,
            fileName: typeof fileName === 'string' ? fileName : undefined,
            mimeType: typeof type === 'string' ? type : undefined
        });

        res.json({ success: true, count: documents.length, documents });
    } catch (error) {
        logger.error({ error, query: req.query }, 'Failed to list documents');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a single file
app.delete('/backend/api/storage/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const result = await storageService.delete([id as string]);
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'File not found or already deleted' });
        }

        res.json({ success: true, message: 'File deleted successfully', id });
    } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to delete file');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete multiple files
app.post('/backend/api/storage/delete-bulk', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid or empty ids list' });
        }

        const result = await storageService.delete(ids);
        
        res.json({ 
            success: true, 
            message: `Successfully deleted ${result.deletedCount} files`, 
            deletedCount: result.deletedCount,
            ids: result.ids 
        });
    } catch (error) {
        logger.error({ error, body: req.body }, 'Failed to delete files in bulk');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error Handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, url: req.url }, 'Unhandled error occurred');
    res.status(500).json({ error: 'Internal Server Error' });
});

const start = async () => {
    try {
        await initDb();
        app.listen(ENV.PORT, () => {
            logger.info(`Storage service listening on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`);
        });
    } catch (err) {
        logger.fatal({ err }, 'Failed to start storage-service');
        process.exit(1);
    }
};

start();
