const { URL } = require('url');

async function getJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getQuery(req) {
  if (req.query && typeof req.query === 'object') {
    return req.query;
  }
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

function getParam(req, name) {
  const query = getQuery(req);
  return query[name];
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function ok(res, payload) {
  json(res, 200, payload);
}

function created(res, payload) {
  json(res, 201, payload);
}

function noContent(res) {
  res.statusCode = 204;
  res.end();
}

function error(res, statusCode, message, errors) {
  const payload = { message };
  if (errors) {
    payload.errors = errors;
  }
  json(res, statusCode, payload);
}

module.exports = {
  getJsonBody,
  getQuery,
  getParam,
  json,
  ok,
  created,
  noContent,
  error,
};
