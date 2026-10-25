// Public certificate fingerprints only. Never pass passwords or private keys here.
const fs = require('node:fs');
function assetlinks(fingerprints) {
  if (!Array.isArray(fingerprints) || !fingerprints.length || fingerprints.some(v => typeof v !== 'string' || !/^(?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(v))) {
    throw Error('Provide a JSON array of real SHA-256 signing certificate fingerprints (32 colon-separated bytes).');
  }
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: {
    namespace: 'android_app', package_name: 'com.savingduit.app', sha256_cert_fingerprints: [...new Set(fingerprints.map(v => v.toUpperCase()))]
  } }];
}
if (require.main === module) {
  const result = assetlinks(JSON.parse(process.env.ANDROID_CERT_SHA256_JSON || '[]'));
  fs.mkdirSync('public/.well-known', { recursive: true });
  fs.writeFileSync('public/.well-known/assetlinks.json', JSON.stringify(result, null, 2) + '\n');
  console.log('Generated public/.well-known/assetlinks.json; review before deploying.');
}
module.exports = assetlinks;
