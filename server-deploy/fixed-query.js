// This utility function handles null values in queries by converting them to undefined
const nullSafeValue = (value) => value === null ? undefined : value;

module.exports = { nullSafeValue };
