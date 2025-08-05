const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const qs = require('qs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Root endpoint (optional, for health check)
app.get('/', (req, res) => {
  res.send('✅ TikTok OAuth App is running!');
});

// TikTok OAuth Callback
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('❌ Authorization code tidak ditemukan');
  }

  try {
    const tokenUrl = 'https://auth.tiktok-shopsandbox.com/api/token';

    const payload = qs.stringify({
      client_key: process.env.CLIENT_KEY,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.REDIRECT_URI
    });

    const response = await axios.post(tokenUrl, payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, access_token_expire_in } = response.data;

    res.send(`
      <h2>✅ Access Token Berhasil Didapatkan!</h2>
      <p><strong>Access Token:</strong> ${access_token}</p>
      <p><strong>Refresh Token:</strong> ${refresh_token}</p>
      <p><strong>Expired Dalam:</strong> ${access_token_expire_in} detik</p>
    `);
  } catch (error) {
    console.error('❌ Gagal mendapatkan token:', error.response?.data || error.message);
    res.status(500).send('❌ Gagal menukar authorization code dengan token.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
