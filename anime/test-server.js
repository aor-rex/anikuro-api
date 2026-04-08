/**
 * Test server wrapper for standalone pahe-api testing.
 * Usage: node test-server.js
 */
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
