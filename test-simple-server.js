const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('Starting test server...');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from test server!\n');
});

const PORT = 3000;
server.listen(PORT, 'localhost', () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  
  // write PID file
  const pidFile = path.join(__dirname, 'test-server.pid');
  fs.writeFileSync(pidFile, process.pid.toString());
  console.log('PID file written:', pidFile);
});

// handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
