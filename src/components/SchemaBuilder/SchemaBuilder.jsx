'use client';

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FieldsBox from './FieldsBox';
import FieldEditor from './FieldEditor';
import PreviewBox from './PreviewBox';

/**
 * Schema Builder Container
 * Main component managing state and orchestrating sub-components
 */
export default function SchemaBuilder() {
  const [fields, setFields] = useState([]);
  const [preview, setPreview] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Get selected field object
  const selectedField =
    fields.find((f) => f.id === selectedFieldId) ||
    preview.find((f) => f.id === selectedFieldId);

  // Create new field
  const handleCreateField = useCallback(() => {
    const newField = {
      id: uuidv4(),
      name: 'new_field',
      depth: 1,
      description: '',
      required: false,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, []);

  // Update field (in fields list)
  const handleUpdateField = useCallback((updatedField) => {
    setFields((prev) =>
      prev.map((f) => (f.id === updatedField.id ? updatedField : f))
    );
    // Also update in preview if it exists there
    setPreview((prev) =>
      prev.map((f) => (f.id === updatedField.id ? updatedField : f))
    );
  }, []);

  // Delete field from fields box
  const handleDeleteField = useCallback((fieldId) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    // Also remove from preview
    setPreview((prev) => prev.filter((f) => f.id !== fieldId));
    // Clear selection if deleted
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }, [selectedFieldId]);

  // Drag start from Fields Box
  const handleDragStart = useCallback((field) => {
    // We'll handle this in the drop handler instead
  }, []);

  // Add field to preview (copy from Fields Box)
  const handleAddFieldToPreview = useCallback((field, insertBeforeIndex) => {
    const fieldCopy = { ...field };
    setPreview((prev) => {
      const newPreview = [...prev];
      newPreview.splice(insertBeforeIndex, 0, fieldCopy);
      return newPreview;
    });
    setSelectedFieldId(field.id);
  }, []);

  // Remove field from preview only
  const handleRemoveFieldFromPreview = useCallback((fieldId) => {
    setPreview((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }, [selectedFieldId]);

  // Reorder fields in preview
  const handleReorderFields = useCallback((newPreview) => {
    setPreview(newPreview);
  }, []);

  // Select field (for editing)
  const handleSelectField = useCallback((fieldId) => {
    setSelectedFieldId(fieldId);
  }, []);

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Left column (50%) - split into top and bottom */}
      <div className="w-1/2 flex flex-col gap-4">
        {/* Top left - Fields Box */}
        <div className="flex-1 border rounded-lg p-4 bg-white overflow-hidden">
          <FieldsBox
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            onCreateField={handleCreateField}
            onDeleteField={handleDeleteField}
            onDragStart={handleDragStart}
          />
        </div>

        {/* Bottom left - Field Editor */}
        <div className="flex-1 border rounded-lg p-4 bg-white overflow-hidden">
          <FieldEditor
            selectedField={selectedField}
            onUpdateField={handleUpdateField}
          />
        </div>
      </div>

      {/* Right column (50%) - Preview Box */}
      <div className="w-1/2">
        <PreviewBox
          preview={preview}
          selectedFieldId={selectedFieldId}
          onSelectField={handleSelectField}
          onReorderFields={handleReorderFields}
          onAddFieldToPreview={handleAddFieldToPreview}
          onRemoveFieldFromPreview={handleRemoveFieldFromPreview}
        />
      </div>
    </div>
  );
}
