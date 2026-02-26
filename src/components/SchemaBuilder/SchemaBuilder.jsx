'use client';

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FieldsBox from './FieldsBox';
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
    // Clear selection first (reset editor)
    setSelectedFieldId(null);
    
    // Then create new field and set it as selected
    const newField = {
      id: uuidv4(),
      name: '',
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

  // Add field to preview (copy from Fields Box)
  const handleAddFieldToPreview = useCallback((field, insertBeforeIndex) => {
    const fieldCopy = { ...field };
    setPreview((prev) => {
      const newPreview = [...prev];
      // insertBeforeIndex of -1 means add to end
      if (insertBeforeIndex === -1) {
        newPreview.push(fieldCopy);
      } else {
        newPreview.splice(insertBeforeIndex, 0, fieldCopy);
      }
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

  // Check if a field is already in preview
  const isFieldInPreview = (fieldId) => {
    return preview.some((f) => f.id === fieldId);
  };

  // Add new field to preview (after "Add to Schema" button clicked)
  const handleAddToSchema = useCallback(() => {
    if (selectedField && selectedField.name && selectedField.name.trim().length > 0) {
      const fieldCopy = { ...selectedField };
      setPreview((prev) => [...prev, fieldCopy]);
      // Reset the editor form
      setSelectedFieldId(null);
    }
  }, [selectedField]);

  return (
    <div className="h-full flex gap-4 flex-col md:flex-row">
      {/* Left column (50%) - Fields CRUD Box */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 border rounded-lg p-4 bg-white overflow-hidden flex flex-col">
          <FieldsBox
            selectedField={selectedField}
            isFieldInPreview={isFieldInPreview}
            onCreateField={handleCreateField}
            onUpdateField={handleUpdateField}
            onAddToSchema={handleAddToSchema}
          />
        </div>
      </div>

      {/* Right column (50%) - Preview Box */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 border rounded-lg p-4 bg-white overflow-hidden flex flex-col">
          <PreviewBox
            preview={preview}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            onReorderFields={handleReorderFields}
            onRemoveFieldFromPreview={handleRemoveFieldFromPreview}
          />
        </div>
      </div>
    </div>
  );
}
