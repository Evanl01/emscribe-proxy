/**
 * Validation utilities for LLM Response Template Builder
 */

/**
 * Check if first field in preview has section_level 1
 * @param {Array} preview - Fields in preview box
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateFirstFieldSectionLevel = (preview) => {
  if (preview.length === 0) {
    return { isValid: true, message: '' };
  }

  const firstField = preview[0];
  if (firstField.section_level !== 1) {
    return {
      isValid: false,
      message: `First field must be Section Level 1. For field "${firstField.name}". (Currently Section Level ${firstField.section_level})`,
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Check for missing parent section_levels in preview order
 * @param {Array} preview - Fields in preview box, ordered
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateSectionLevelProgression = (preview) => {
  const errors = [];
  let previousSectionLevel = 0;

  preview.forEach((field, index) => {
    const nextSectionLevel = field.section_level;

    // If jumping from previous section_level to a section_level that skips levels
    // e.g., previous was 1, next is 3 (missing 2)
    if (nextSectionLevel > previousSectionLevel + 1) {
      errors.push({
        fieldName: field.name,
        index,
        message: `For field "${field.name}". Section Level must have NO SKIPPED LEVELS (e.g. 1, 2, 3 or 1, 2, 1, 2, 2, 3). You have a level ${nextSectionLevel} field but no level ${previousSectionLevel + 1} parent before it. Add a level ${previousSectionLevel + 1} field first.`,
      });
    }

    previousSectionLevel = nextSectionLevel;
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

  const parentSectionLevel = preview[parentIndex].section_level;
  const children = [];

  for (let i = parentIndex + 1; i < preview.length; i++) {
    if (preview[i].section_level <= parentSectionLevel) break;
    if (preview[i].section_level === parentSectionLevel + 1) {
      children.push(preview[i]);
    }
  }

  return children;
};

/**
 * Check for duplicate field IDs
 * @param {Array} preview - Fields in preview box
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateFieldIdUniqueness = (preview) => {
  const errors = [];
  const seenIds = new Set();

  preview.forEach((field, index) => {
    if (seenIds.has(field.id)) {
      errors.push({
        fieldName: field.name,
        index,
        message: `Duplicate field ID. For field "${field.name}". (Please delete and re-create this field)`,
      });
    }
    seenIds.add(field.id);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check for required field properties
 * @param {Array} preview - Fields in preview box
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateRequiredProperties = (preview) => {
  const errors = [];

  preview.forEach((field, index) => {
    const missingProps = [];

    if (!field.id) missingProps.push('id');
    if (!field.name) missingProps.push('Name');
    if (field.section_level === undefined || field.section_level === null) missingProps.push('Section Level');
    if (!field.description) missingProps.push('Description');

    if (missingProps.length > 0) {
      errors.push({
        fieldName: field.name || '(unnamed)',
        index,
        message: `Missing required properties: ${missingProps.join(', ')}. For field "${field.name || '(unnamed)'}".`,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check that section_level is a positive integer between 1-5
 * @param {Array} preview - Fields in preview box
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
export const validateSectionLevelRange = (preview) => {
  const errors = [];
  const MIN_SECTION_LEVEL = 1;
  const MAX_SECTION_LEVEL = 5;

  preview.forEach((field, index) => {
    if (
      typeof field.section_level !== 'number' ||
      !Number.isInteger(field.section_level) ||
      field.section_level < MIN_SECTION_LEVEL ||
      field.section_level > MAX_SECTION_LEVEL
    ) {
      errors.push({
        fieldName: field.name,
        index,
        message: `Section Level must be integer between ${MIN_SECTION_LEVEL}-${MAX_SECTION_LEVEL}. For field "${field.name}". (Currently: ${field.section_level})`,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
