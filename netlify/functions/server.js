const serverless = require('serverless-http');
const express = require('express');
const path = require('path');

// Import main server logic
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../..')));

// Import main server routes
const mainServer = require('../../server.js');

module.exports.handler = serverless(app);