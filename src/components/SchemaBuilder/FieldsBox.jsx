'use client';

import React, { useState } from 'react';
import FieldCard from './FieldCard';

/**
 * Fields Box (top-left)
 * Displays all created fields
 * - Click to select for editing
 * - Drag to copy to Preview Box
 */
export default function FieldsBox({
  fields,
  selectedFieldId,
  onSelectField,
  onCreateField,
  onDeleteField,
  onDragStart,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Fields</h2>
      </div>

      {/* Create new field button */}
      <button
        onClick={onCreateField}
        className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium"
      >
        + Create new field
      </button>

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {fields.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No fields yet</p>
            <p className="text-sm">Click "Create new field" to get started</p>
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify(field));
                onDragStart?.(field);
              }}
              onMouseEnter={() => setHoveredId(field.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group"
            >
              <FieldCard
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={onSelectField}
                onDelete={onDeleteField}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
