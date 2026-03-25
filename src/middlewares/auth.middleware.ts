import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username?: string;
        email?: string;
    };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // For development/local testing without Kong, we can allow a x-user-id header
    const userId = req.headers['x-user-id'] as string;
    
    // First check Authorization header
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    const queryToken = req.query.jwt as string;

    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader; // Kong might forward without Bearer prefix
        }
    } else if (queryToken) {
        token = queryToken; // Fallback to query param if not using Kong
    }

    if (token) {
        try {
            const decoded = jwt.decode(token) as any;
            if (decoded && decoded.sub) {
                req.user = {
                    id: decoded.sub,
                    username: decoded.preferred_username,
                    email: decoded.email
                };
                return next();
            }
        } catch (err) {
            logger.error({ err }, 'Token decode error');
        }
    }

    // Fallback to x-user-id if in development and no token
    if (process.env.NODE_ENV === 'development' && userId) {
        req.user = { id: userId };
        return next();
    }

    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
};
