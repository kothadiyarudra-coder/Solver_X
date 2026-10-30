const { v4: uuidv4 } = require('uuid');

/**
 * Generate a stable, uniquely identifiable Run ID
 * @param {string} prefix 
 * @returns {string}
 */
function generateRunId(prefix = 'run') {
  return `${prefix}-${uuidv4().substring(0, 8)}`;
}

/**
 * Generate a stable, uniquely identifiable Event ID
 * @param {string} prefix 
 * @returns {string}
 */
function generateEventId(prefix = 'event') {
  return `${prefix}-${uuidv4().substring(0, 8)}`;
}

module.exports = {
  generateRunId,
  generateEventId,
};

