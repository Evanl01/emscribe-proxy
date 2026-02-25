/**
 * Validation utilities for schema builder
 */

/**
 * Check if first field in preview has depth 1
 * @param {Array} preview - Fields in preview box
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateFirstFieldDepth = (preview) => {
  if (preview.length === 0) {
    return { isValid: true, message: '' };
  }

  const firstField = preview[0];
  if (firstField.depth !== 1) {
    return {
      isValid: false,
      message: `First field must have Depth 1. "${firstField.name}" has Depth ${firstField.depth}.`,
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Check for missing parent depths in preview order
 * @param {Array} preview - Fields in preview box, ordered
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateDepthProgression = (preview) => {
  const errors = [];
  let previousDepth = 0;

  preview.forEach((field, index) => {
    const nextDepth = field.depth;

    // If jumping from previous depth to a depth that skips levels
    // e.g., previous was 1, next is 3 (missing 2)
    if (nextDepth > previousDepth + 1) {
      errors.push({
        fieldName: field.name,
        index,
        message: `"${field.name}" has Depth ${nextDepth}, but previous field has Depth ${previousDepth}. Missing parent at Depth ${previousDepth + 1}.`,
      });
    }

    previousDepth = nextDepth;
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get child fields of a given field in preview
 * @param {Array} preview - Fields in preview box
 * @param {String} parentId - ID of parent field
 * @returns {Array} - Child fields
 */
export const getChildFields = (preview, parentId) => {
  const parentIndex = preview.findIndex((f) => f.id === parentId);
  if (parentIndex === -1) return [];

  const parentDepth = preview[parentIndex].depth;
  const children = [];

  for (let i = parentIndex + 1; i < preview.length; i++) {
    if (preview[i].depth <= parentDepth) break;
    if (preview[i].depth === parentDepth + 1) {
      children.push(preview[i]);
    }
  }

  return children;
};
