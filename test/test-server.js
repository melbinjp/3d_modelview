/**
 * Enhanced test server for web standards testing
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Security headers for production-like testing
app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CORS for testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Cache control for static assets
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
    
    next();
});

// Serve built files from dist directory
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
} else {
    // Fallback to serving from root for development
    app.use(express.static(path.resolve(__dirname, '..')));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API endpoint for testing
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Test API endpoint working',
        timestamp: new Date().toISOString()
    });
});

// Catch-all handler for SPA routing
app.use((req, res) => {
    const indexPath = fs.existsSync(path.join(distPath, 'index.html')) 
        ? path.join(distPath, 'index.html')
        : path.resolve(__dirname, '../index.html');
    
    res.sendFile(indexPath);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server if this file is run directly
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Test server running on http://localhost:${PORT}`);
        console.log(`📁 Serving from: ${fs.existsSync(distPath) ? distPath : 'project root'}`);
        console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}

module.exports = app;