'use client';

import React from 'react';

/**
 * Field Editor (bottom-left)
 * Edit selected field's properties:
 * - Name
 * - Depth (1-5)
 * - Description
 * - Required checkbox
 */
export default function FieldEditor({
  selectedField,
  onUpdateField,
}) {
  if (!selectedField) {
    return (
      <div className="flex flex-col h-full gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Edit Field</h2>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p>Select a field to edit</p>
        </div>
      </div>
    );
  }

  const handleChange = (field, value) => {
    onUpdateField({
      ...selectedField,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Edit Field</h2>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Field Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Name
          </label>
          <input
            type="text"
            value={selectedField.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Chief complaint"
          />
        </div>

        {/* Depth */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depth
          </label>
          <p className="text-xs text-gray-500 mb-2">
            How nested this field is in the structure
          </p>
          <select
            value={selectedField.depth}
            onChange={(e) => handleChange('depth', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                Depth {level}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={selectedField.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What is this field for? (optional)"
          />
        </div>

        {/* Required checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="required"
            checked={selectedField.required}
            onChange={(e) => handleChange('required', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="required" className="text-sm font-medium text-gray-700 cursor-pointer">
            Required field
          </label>
        </div>
      </div>
    </div>
  );
}
