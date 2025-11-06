// Simple stub to encapsulate post-insert marketing actions for Google Vehicle Ads and Meta Catalog
const axios = require('axios');

async function onCarCreated(car) {
  // In a future iteration, queue background jobs here. For now, best-effort ping self feed endpoints.
  const base = process.env.PUBLIC_BASE_URL; // e.g., https://yourdomain.com
  if (!base) return;
  const urls = [
    `${base}/feeds/google-vehicles.json`,
    `${base}/feeds/meta-vehicles.csv`
  ];
  for (const url of urls) {
    try { await axios.get(url, { timeout: 3000 }); } catch (_) {}
  }
}

module.exports = { onCarCreated };


