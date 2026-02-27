"use client";

import React, { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import FieldsBox from "./FieldsBox";
import PreviewBox from "./PreviewBox";
import LLMResponseTemplateReviewOverlay from "../LLMResponseTemplateReviewOverlay";

/**
 * LLM Response Template Builder Container
 * Main component managing state and orchestrating sub-components
 */
export default function LLMResponseTemplateBuilder() {
  const [fields, setFields] = useState([]);
  const [preview, setPreview] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [isReviewOverlayOpen, setIsReviewOverlayOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      name: "",
      section_level: 1,
      description: "",
      required: false,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, []);

  // Update field (in fields list)
  const handleUpdateField = useCallback((updatedField) => {
    setFields((prev) =>
      prev.map((f) => (f.id === updatedField.id ? updatedField : f)),
    );
    // Also update in preview if it exists there
    setPreview((prev) =>
      prev.map((f) => (f.id === updatedField.id ? updatedField : f)),
    );
  }, []);

  // Delete field from fields box
  const handleDeleteField = useCallback(
    (fieldId) => {
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      // Also remove from preview
      setPreview((prev) => prev.filter((f) => f.id !== fieldId));
      // Clear selection if deleted
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
    },
    [selectedFieldId],
  );

  // Add field to preview (copy from Fields Box)
  // Note: This function is not currently used. The actual "Add to Template" logic is in handleAddToTemplate above.
  // Kept here for reference / potential future use.
  // const handleAddFieldToPreview = useCallback((field, insertBeforeIndex) => {
  //   const fieldCopy = {
  //     ...field,
  //     name: field.name.trim(),
  //     description: field.description.trim(),
  //   };
  //   console.log(`Adding to preview: id=${fieldCopy.id}, name="${field.name}" -> "${fieldCopy.name}"`);
  //   setPreview((prev) => {
  //     const newPreview = [...prev];
  //     if (insertBeforeIndex === -1) {
  //       newPreview.push(fieldCopy);
  //     } else {
  //       newPreview.splice(insertBeforeIndex, 0, fieldCopy);
  //     }
  //     return newPreview;
  //   });
  //   setSelectedFieldId(field.id);
  // }, []);

  // Remove field from preview only
  const handleRemoveFieldFromPreview = useCallback(
    (fieldId) => {
      setPreview((prev) => prev.filter((f) => f.id !== fieldId));
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
    },
    [selectedFieldId],
  );

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

  // Add new field to preview (after "Add to Template" button clicked)
  const handleAddToTemplate = useCallback(() => {
    if (
      selectedField &&
      selectedField.name &&
      selectedField.name.trim().length > 0
    ) {
      const fieldCopy = {
        ...selectedField,
        name: selectedField.name.trim(),
        description: selectedField.description.trim(),
      };
      console.log(
        `Adding to preview: id=${fieldCopy.id}, name="${selectedField.name}" -> "${fieldCopy.name}"`,
      );

      // Update the field in the fields list with trimmed values
      setFields((prev) =>
        prev.map((f) => (f.id === selectedField.id ? fieldCopy : f)),
      );

      // Add to preview
      setPreview((prev) => [...prev, fieldCopy]);
      // Reset the editor form
      setSelectedFieldId(null);
    }
  }, [selectedField]);

  // Handle opening review overlay
  const handleOpenReview = useCallback(() => {
    setErrorMessage("");
    setIsReviewOverlayOpen(true);
  }, []);

  // Handle closing review overlay
  const handleCloseReview = useCallback(() => {
    setIsReviewOverlayOpen(false);
    setErrorMessage("");
  }, []);

  // Handle saving template (placeholder)
  const handleSaveTemplate = useCallback((jsonData) => {
    setIsSaving(true);
    setErrorMessage("");

    // TODO: Implement actual save logic here
    console.log("Saving template:", jsonData);

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      handleCloseReview();
    }, 1000);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Columns container */}
      <div className="flex gap-4 flex-col md:flex-row md:items-stretch">
        {/* Left column (50%) - Fields CRUD Box */}
        <div className="flex-1 flex flex-col">
          <div className="h-full border rounded-lg p-4 bg-white flex flex-col">
            <FieldsBox
              selectedField={selectedField}
              isFieldInPreview={isFieldInPreview}
              onCreateField={handleCreateField}
              onUpdateField={handleUpdateField}
              onAddToTemplate={handleAddToTemplate}
            />
          </div>
        </div>

        {/* Right column (50%) - Preview Box */}
        <div className="flex-1 flex flex-col" style={{ minHeight: "60vh" }}>
          <div className="h-full border rounded-lg p-4 bg-white flex flex-col">
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

      {/* Review & Save Template button */}
      <button
        onClick={handleOpenReview}
        disabled={preview.length === 0}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        title="Review and save your template"
      >
        Review & Save Template
      </button>

      {/* Review Overlay */}
      <LLMResponseTemplateReviewOverlay
        isOpen={isReviewOverlayOpen}
        onClose={handleCloseReview}
        previewFields={preview.map((f) => ({
          ...f,
          name: f.name.trim(),
          description: f.description.trim(),
        }))}
        onSave={handleSaveTemplate}
        isSaving={isSaving}
        errorMessage={errorMessage}
      />
    </div>
  );
}
