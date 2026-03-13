/**
 * Process an array of items in batches with concurrency control.
 * Prevents unbounded Promise.all() from overwhelming the database.
 *
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item
 * @param {number} batchSize - Max items processed concurrently (default 5)
 * @returns {Array} Results in original order
 */
export async function batchProcess(items, fn, batchSize = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}
