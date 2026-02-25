'use client';

import React, { useState, useRef } from 'react';
import FieldCard from './FieldCard';
import { validateFirstFieldDepth } from '@/src/utils/schemaValidation';

/**
 * Preview Box (right side)
 * Display fields in order with indentation
 * - Click to select for editing
 * - Drag to reorder
 * - Drop from Fields Box to add
 */
export default function PreviewBox({
  preview,
  selectedFieldId,
  onSelectField,
  onReorderFields,
  onAddFieldToPreview,
  onRemoveFieldFromPreview,
}) {
  const [draggedFieldId, setDraggedFieldId] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const containerRef = useRef(null);
  const fieldRefs = useRef({});

  // Validation
  const validation = validateFirstFieldDepth(preview);

  /**
   * Calculate insert index based on drop Y position
   */
  const getInsertIndexFromY = (clientY) => {
    console.log('getInsertIndexFromY called with clientY:', clientY);
    
    if (!containerRef.current || preview.length === 0) {
      console.log('Container or preview empty, returning:', preview.length);
      return preview.length;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - containerRect.top;
    
    console.log('Container rect:', containerRect);
    console.log('Relative Y:', relativeY);

    // Check each field's position
    for (let i = 0; i < preview.length; i++) {
      const fieldElement = fieldRefs.current[preview[i].id];
      if (!fieldElement) {
        console.log(`Field ${i} (id: ${preview[i].id}): NO REF FOUND`);
        continue;
      }

      const fieldRect = fieldElement.getBoundingClientRect();
      const fieldRelativeTop = fieldRect.top - containerRect.top;
      const fieldRelativeBottom = fieldRect.bottom - containerRect.top;
      const fieldMidpoint = fieldRelativeTop + fieldRect.height / 2;

      console.log(`Field ${i} (${preview[i].name}):`, {
        relativeTop: fieldRelativeTop,
        relativeBottom: fieldRelativeBottom,
        midpoint: fieldMidpoint,
        height: fieldRect.height
      });

      // If dropping in upper half of field, insert before
      if (relativeY < fieldMidpoint) {
        console.log(`RelativeY ${relativeY} < midpoint ${fieldMidpoint}, inserting at index ${i}`);
        return i;
      }
    }

    // Default to end
    console.log('No match, returning end position:', preview.length);
    return preview.length;
  };

  const handleDragOver = (e) => {
    console.log('PreviewBox: onDragOver fired');
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    console.log('PreviewBox: onDragLeave fired');
    setIsDraggingOver(false);
  };

  const handleDrop = (e, dropIndex) => {
    console.log('=== HANDLE DROP CALLED ===');
    console.log('PreviewBox: onDrop fired');
    e.preventDefault();
    setIsDraggingOver(false);

    // Use the dropIndex parameter if provided, or calculate from Y position
    const insertIndex = dropIndex !== undefined ? dropIndex : getInsertIndexFromY(e.clientY);
    console.log('Insert index:', insertIndex);

    // Check if dragging from Fields Box (has JSON data)
    const dragData = e.dataTransfer.getData('application/json');
    console.log('Drag data:', dragData);
    
    if (dragData) {
      try {
        const field = JSON.parse(dragData);
        console.log('Parsed field:', field);
        onAddFieldToPreview?.(field, insertIndex);
      } catch (err) {
        console.error('Failed to parse drag data:', err);
      }
      setDraggedFieldId(null);
      return;
    }

    // If it's a reorder within preview
    console.log('Checking reorder. draggedFieldId:', draggedFieldId);
    if (draggedFieldId) {
      console.log('Reordering field:', draggedFieldId);
      const draggedIndex = preview.findIndex((f) => f.id === draggedFieldId);
      console.log('Dragged index:', draggedIndex, 'Insert index:', insertIndex);
      
      if (draggedIndex !== -1 && draggedIndex !== insertIndex) {
        console.log('Moving field from index', draggedIndex, 'to', insertIndex);
        const newPreview = [...preview];
        const [movedField] = newPreview.splice(draggedIndex, 1);
        const targetIndex =
          draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;
        newPreview.splice(targetIndex, 0, movedField);
        console.log('New preview order:', newPreview.map(f => f.name));
        onReorderFields?.(newPreview);
      } else {
        console.log('No reorder needed (same position)');
      }
      setDraggedFieldId(null);
    }
  };

  const handleFieldDragStart = (e, fieldId) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFieldId(fieldId);
  };

  const handleFieldDragEnd = () => {
    setDraggedFieldId(null);
    setIsDraggingOver(false);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full gap-3 border-2 rounded-lg p-4 transition-colors ${
        isDraggingOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-dashed border-gray-300 bg-gray-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Preview & Ordering</h2>
      </div>

      {/* Warning Banner */}
      {!validation.isValid && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-sm font-medium text-red-800">{validation.message}</p>
        </div>
      )}

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto space-y-0 pr-2">
        {preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="font-medium">Drag fields here to order them</p>
            <p className="text-sm">Fields will appear with indentation based on their depth</p>
          </div>
        ) : (
          <>
            {/* Drop zone before first field */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use 'move' if reordering within preview, 'copy' if from Fields Box
                e.dataTransfer.dropEffect = draggedFieldId ? 'move' : 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drop on zone index: 0');
                handleDrop(e, 0);
              }}
              className="h-6 flex items-center justify-center hover:bg-blue-100 transition-colors rounded"
            >
              <div className="text-xs text-gray-400">Drop before first</div>
            </div>

            {preview.map((field, index) => (
              <div key={field.id}>
                <div
                  ref={(el) => {
                    if (el) fieldRefs.current[field.id] = el;
                  }}
                  onClick={(e) => {
                    // Don't select if we just finished dragging
                    if (draggedFieldId === field.id) {
                      return;
                    }
                    onSelectField?.(field.id);
                  }}
                  className={`
                    transition-opacity flex items-start gap-2
                    ${draggedFieldId === field.id ? 'opacity-50' : 'opacity-100'}
                  `}
                  style={{
                    marginLeft: `${(field.depth - 1) * 1.5}rem`,
                  }}
                >
                  {/* Drag handle */}
                  <div
                    draggable
                    onDragStart={(e) => handleFieldDragStart(e, field.id)}
                    onDragEnd={handleFieldDragEnd}
                    className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing hover:bg-gray-200 rounded"
                    title="Drag to reorder"
                  >
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM8 11a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 11a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
                    </svg>
                  </div>

                  {/* Field card */}
                  <div className="flex-1">
                    <FieldCard
                      field={field}
                      isSelected={selectedFieldId === field.id}
                      onSelect={onSelectField}
                      onDelete={onRemoveFieldFromPreview}
                      isDragSource={draggedFieldId === field.id}
                    />
                  </div>
                </div>

                {/* Drop zone after field */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Use 'move' if reordering within preview, 'copy' if from Fields Box
                    e.dataTransfer.dropEffect = draggedFieldId ? 'move' : 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Drop on zone index:', index + 1);
                    handleDrop(e, index + 1);
                  }}
                  className="h-6 flex items-center justify-center hover:bg-blue-100 transition-colors rounded"
                  style={{
                    marginLeft: `${(field.depth - 1) * 1.5}rem`,
                  }}
                >
                  <div className="text-xs text-gray-400">Drop after</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
