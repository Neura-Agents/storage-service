export interface FileMetadata {
    id?: string;
    userId: string;
    fileName: string;
    storageKey: string;
    url: string;
    size: number;
    mimeType?: string;
    metadata?: Record<string, any>;
    isPublic?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UploadResult {
    key: string;
    url: string;
    metadata?: FileMetadata;
}
