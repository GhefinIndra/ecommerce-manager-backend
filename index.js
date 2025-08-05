const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const qs = require('qs');

// Load environment variables
dotenv.config();

const app = express();

// ✅ PERBAIKAN 1: Port configuration dengan fallback
const PORT = process.env.PORT || 8080;

// ✅ PERBAIKAN 2: Middleware untuk parsing request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ PERBAIKAN 3: Health check endpoint untuk Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// ✅ PERBAIKAN 4: Root endpoint dengan environment info
app.get('/', (req, res) => {
  console.log('🌐 Root endpoint accessed');
  
  res.send(`
    <h2>✅ TikTok OAuth Server Running!</h2>
    <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
    <p><strong>Port:</strong> ${PORT}</p>
    <p><strong>Client Key:</strong> ${process.env.CLIENT_KEY ? '✅ Set' : '❌ Missing'}</p>
    <p><strong>Client Secret:</strong> ${process.env.CLIENT_SECRET ? '✅ Set' : '❌ Missing'}</p>
    <p><strong>Redirect URI:</strong> ${process.env.REDIRECT_URI || '❌ Missing'}</p>
    <hr>
    <p>Endpoint: <code>/oauth/callback</code></p>
    <p>Health: <code>/health</code></p>
  `);
});

// ✅ PERBAIKAN 5: Enhanced OAuth callback dengan better error handling
app.get('/oauth/callback', async (req, res) => {
  console.log('🔄 OAuth callback called with query:', req.query);
  
  const { code, state, error, error_description } = req.query;

  // Handle TikTok OAuth errors
  if (error) {
    console.error('❌ OAuth Error:', error, error_description);
    return res.status(400).send(`
      <h2>❌ OAuth Error</h2>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Description:</strong> ${error_description || 'No description'}</p>
    `);
  }

  if (!code) {
    console.error('❌ No authorization code found');
    return res.status(400).send(`
      <h2>❌ Error</h2>
      <p>Authorization code tidak ditemukan dalam request</p>
      <p>Query parameters: ${JSON.stringify(req.query)}</p>
    `);
  }

  // Validate environment variables
  if (!process.env.CLIENT_KEY || !process.env.CLIENT_SECRET || !process.env.REDIRECT_URI) {
    console.error('❌ Missing environment variables');
    return res.status(500).send(`
      <h2>❌ Server Configuration Error</h2>
      <p>Environment variables tidak lengkap:</p>
      <ul>
        <li>CLIENT_KEY: ${process.env.CLIENT_KEY ? '✅' : '❌'}</li>
        <li>CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✅' : '❌'}</li>
        <li>REDIRECT_URI: ${process.env.REDIRECT_URI ? '✅' : '❌'}</li>
      </ul>
    `);
  }

  try {
    console.log('🔄 Requesting access token...');
    
    // ✅ PERBAIKAN 6: Updated TikTok API endpoint (berdasarkan dokumentasi terbaru)
    const tokenUrl = 'https://auth.tiktok-shops.com/api/v2/token/get';
    
    const payload = {
      app_key: process.env.CLIENT_KEY,
      app_secret: process.env.CLIENT_SECRET,
      auth_code: code,
      grant_type: 'authorized_code'
    };

    console.log('📤 Sending request to:', tokenUrl);
    console.log('📤 Payload (without secret):', {
      app_key: payload.app_key,
      auth_code: payload.auth_code,
      grant_type: payload.grant_type
    });

    const response = await axios.post(tokenUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', response.data);

    // Handle TikTok API response format
    if (response.data.code !== 0) {
      throw new Error(`TikTok API Error: ${response.data.message} (Code: ${response.data.code})`);
    }

    const tokenData = response.data.data;
    const { access_token, refresh_token, access_token_expire_in } = tokenData;

    console.log('✅ Token exchange successful!');

    res.send(`
      <h2>✅ Access Token Berhasil Didapatkan!</h2>
      <p><strong>Access Token:</strong> <code>${access_token}</code></p>
      <p><strong>Refresh Token:</strong> <code>${refresh_token}</code></p>
      <p><strong>Expired Dalam:</strong> ${access_token_expire_in} detik</p>
      <hr>
      <h3>📋 Response Data Lengkap:</h3>
      <pre>${JSON.stringify(tokenData, null, 2)}</pre>
      <hr>
      <p><small>Timestamp: ${new Date().toISOString()}</small></p>
    `);

  } catch (error) {
    console.error('❌ Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });

    const errorDetails = error.response?.data || error.message;
    
    res.status(500).send(`
      <h2>❌ Gagal Mendapatkan Access Token</h2>
      <p><strong>Error:</strong> ${error.message}</p>
      <h3>📋 Error Details:</h3>
      <pre>${JSON.stringify(errorDetails, null, 2)}</pre>
      <hr>
      <h3>🔍 Debug Info:</h3>
      <p><strong>Request URL:</strong> ${error.config?.url || 'Unknown'}</p>
      <p><strong>Status Code:</strong> ${error.response?.status || 'No response'}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `);
  }
});

// ✅ PERBAIKAN 7: Alternative token endpoint (jika yang pertama tidak work)
app.get('/oauth/callback-v2', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code tidak ditemukan');
  }

  try {
    // Alternative endpoint
    const tokenUrl = 'https://open-api.tiktokglobalshop.com/api/v2/token/get';
    
    const payload = {
      app_key: process.env.CLIENT_KEY,
      app_secret: process.env.CLIENT_SECRET,
      auth_code: code,
      grant_type: 'authorized_code'
    };

    const response = await axios.post(tokenUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ V2 Token Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ✅ PERBAIKAN 8: Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).send(`
    <h2>💥 Internal Server Error</h2>
    <p>${err.message}</p>
  `);
});

// ✅ PERBAIKAN 9: 404 handler
app.use('*', (req, res) => {
  console.log('🔍 404 - Path not found:', req.originalUrl);
  res.status(404).send(`
    <h2>🔍 404 - Not Found</h2>
    <p>Path <code>${req.originalUrl}</code> tidak ditemukan</p>
    <p><a href="/">← Kembali ke halaman utama</a></p>
  `);
});

// ✅ PERBAIKAN 10: Server startup dengan error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server berhasil berjalan di port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Client Key: ${process.env.CLIENT_KEY ? 'SET' : 'MISSING'}`);
  console.log(`🔐 Client Secret: ${process.env.CLIENT_SECRET ? 'SET' : 'MISSING'}`);
  console.log(`🔄 Redirect URI: ${process.env.REDIRECT_URI || 'MISSING'}`);
  
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🚂 Running on Railway');
  }
});

// ✅ PERBAIKAN 11: Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('👋 Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('👋 Process terminated');
  });
});

// ✅ PERBAIKAN 12: Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});