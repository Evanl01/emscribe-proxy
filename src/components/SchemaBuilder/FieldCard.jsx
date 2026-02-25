'use client';

import React from 'react';

/**
 * Reusable field card component
 * Used in both Fields Box and Preview Box
 */
export default function FieldCard({
  field,
  onSelect,
  onDelete,
  isSelected = false,
  isInPreview = false,
  isDragSource = false,
  isDragOver = false,
  children,
}) {
  return (
    <div
      onMouseDown={(e) => {
        // Prevent selection event when clicking delete button
        if (e.target.closest('[data-action="delete"]')) {
          return;
        }
      }}
      onClick={(e) => {
        // Don't select if clicking delete button
        if (e.target.closest('[data-action="delete"]')) {
          return;
        }
        onSelect?.(field.id);
      }}
      className={`
        relative p-3 border-2 rounded-lg cursor-pointer transition-all
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
        ${isDragOver ? 'bg-blue-100 border-blue-400' : ''}
        ${isDragSource ? 'opacity-50' : ''}
        hover:border-gray-400 hover:shadow-sm
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{field.name}</div>
          {field.depth && (
            <div className="text-xs text-gray-500">Depth: {field.depth}</div>
          )}
          {field.description && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
              {field.description}
            </div>
          )}
          {field.required && (
            <div className="text-xs text-red-600 font-medium mt-1">Required</div>
          )}
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            data-action="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(field.id);
            }}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Delete field"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
