const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Add middleware
app.use(express.json());

app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.send(`
    <h1>✅ SERVER HIDUP!</h1>
    <p>Port: ${PORT}</p>
    <p>Time: ${new Date().toISOString()}</p>
    <p>Environment: ${process.env.NODE_ENV}</p>
  `);
});

app.get('/health', (req, res) => {
  console.log('Health check accessed');
  res.status(200).json({ 
    status: 'OK', 
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Path not found:', req.originalUrl);
  res.status(404).send('404 - Not Found');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Railway: ${process.env.RAILWAY_ENVIRONMENT ? 'YES' : 'NO'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down');
  server.close();
});