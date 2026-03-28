function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
}

function formatDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function formatDecimal(value) {
  if (value === null || value === undefined) return null;
  const numberValue = typeof value === 'string' ? Number(value) : Number(value);
  if (Number.isNaN(numberValue)) return null;
  return numberValue.toFixed(2);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

module.exports = { formatDate, formatDateTime, formatDecimal, parseDate };
