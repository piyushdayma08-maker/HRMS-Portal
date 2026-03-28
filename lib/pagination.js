function buildPagination({ page, perPage, total, path }) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, lastPage);
  const from = total === 0 ? null : (currentPage - 1) * perPage + 1;
  const to = total === 0 ? null : Math.min(total, currentPage * perPage);

  const makeUrl = (p) => (p ? `${path}?page=${p}&per_page=${perPage}` : null);

  return {
    links: {
      first: makeUrl(1),
      last: makeUrl(lastPage),
      prev: currentPage > 1 ? makeUrl(currentPage - 1) : null,
      next: currentPage < lastPage ? makeUrl(currentPage + 1) : null,
    },
    meta: {
      current_page: currentPage,
      from,
      last_page: lastPage,
      path,
      per_page: perPage,
      to,
      total,
    },
  };
}

function getPaginationParams(query, defaults = {}) {
  const page = Math.max(1, Number(query.page || defaults.page || 1));
  const perPage = Math.max(1, Number(query.per_page || defaults.perPage || 10));
  return { page, perPage };
}

module.exports = { buildPagination, getPaginationParams };
