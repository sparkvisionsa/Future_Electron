// services/httpClient.js
const axios = require('axios');

const httpClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000, // adjust as needed
  headers: {
    'Content-Type': 'application/json'
  }
});

module.exports = httpClient;
