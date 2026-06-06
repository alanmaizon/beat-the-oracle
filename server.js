const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;

// Serve Vite production assets
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all routes to index.html using Express 5+ compliant wildcard parameter name (*any)
app.get('*any', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server is running on port ${PORT}`);
});
