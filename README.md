# Storage Service

A specialized backend service for managing object storage operations within the AgenticAI platform. It provides a standardized interface for interacting with S3-compliant storage providers.

---

## 🚀 Key Features

- **S3-Compliant Integration**: Seamlessly connects with AWS S3, MinIO, or other S3-compatible storage.
- **Presigned URLs**: Secure, time-limited access for direct file uploads and downloads from the frontend.
- **File Upload Management**: Integrated with `multer` for robust multipart/form-data handling.
- **Metadata Management**: Stores and tracks file-related metadata in a PostgreSQL database.
- **Auditable Logging**: High-performance logging using `pino` for request tracing and error monitoring.

---

## 🛠 Technology Stack

- **Core**: Node.js & Express
- **Language**: TypeScript
- **Storage**: AWS SDK for JavaScript (`@aws-sdk/client-s3`)
- **Database**: PostgreSQL (`pg`)
- **Logging**: Pino & pino-pretty
- **File Handling**: Multer

---

## 📥 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Access to an S3-compliant storage provider (AWS, MinIO, etc.)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in a `.env` file (see `src/config/env.ts` for required keys).

### Development

```bash
npm run dev
```

### Production

1. Build the service:
   ```bash
   npm run build
   ```

2. Start the service:
   ```bash
   npm start
   ```

---

## 🏗 Architecture

- **`src/index.ts`**: Entry point, initialized Express and middlewares.
- **`src/controllers/`**: Handles HTTP request logic.
- **`src/services/`**: Core business logic for S3 operations and metadata storage.
- **`src/routes/`**: API endpoint definitions.
- **`src/models/`**: Database interaction layer.
