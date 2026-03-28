function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function getPath(req) {
  return req.url.split('?')[0];
}

function getFullUrl(req) {
  return `${getBaseUrl(req)}${getPath(req)}`;
}

module.exports = { getBaseUrl, getPath, getFullUrl };
