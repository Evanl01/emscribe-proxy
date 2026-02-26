"use client";

import React, { useState } from "react";

/**
 * Fields CRUD Box (left side)
 * Contains:
 * - Create new field button
 * - Field Editor form
 */
export default function FieldsBox({
  selectedField,
  isFieldInPreview,
  onCreateField,
  onUpdateField,
  onAddToSchema,
}) {
  const [showDepthModal, setShowDepthModal] = useState(false);

  const handleChange = (field, value) => {
    onUpdateField({
      ...selectedField,
      [field]: value,
    });
  };

  // Check if field is valid (has a name and description)
  const isFieldValid =
    selectedField &&
    selectedField.name &&
    selectedField.name.trim().length > 0 &&
    selectedField.description &&
    selectedField.description.trim().length > 0;

  // Check if field is already in preview
  const inPreview = selectedField && isFieldInPreview(selectedField.id);

  // Button should be disabled if field is in preview OR field name is empty
  const isAddButtonDisabled = !selectedField || inPreview || !isFieldValid;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Create new field button */}
      <button
        onClick={onCreateField}
        className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium"
      >
        + Create new field
      </button>

      {/* Edit Field Section */}
      {!selectedField ? (
        <div className="flex flex-col h-full gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Edit Field</h2>
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a field to edit</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Field
              </h2>
              {!inPreview && (
                <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                  New
                </span>
              )}
            </div>
            {inPreview ? null : (
              <button
                onClick={onAddToSchema}
                disabled={isAddButtonDisabled}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors whitespace-nowrap ${
                  isAddButtonDisabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                title={
                  inPreview ? "Field already in schema" : "Add field to schema"
                }
              >
                Add to Schema
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Field Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name
              </label>
              <input
                type="text"
                value={selectedField.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                placeholder="e.g., Chief complaint"
              />
            </div>

            {/* Depth */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Depth
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDepthModal(!showDepthModal)}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors text-xs font-semibold"
                    title="Learn more about depth"
                  >
                    ?
                  </button>

                  {/* Dropdown Info */}
                  {showDepthModal && (
                    <div
                      className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72 z-50 text-sm text-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-medium mb-2">
                        How nested this field is in the schema:
                      </p>
                      <div className="space-y-1 text-xs mb-2">
                        <div>
                          <span className="font-medium">Depth 1:</span>{" "}
                          Top-level parent
                        </div>
                        <div>
                          <span className="font-medium">Depth 2:</span> Child
                        </div>
                        <div>
                          <span className="font-medium">Depth 3:</span>{" "}
                          Grandchild
                        </div>
                      </div>
                      <p className="text-xs italic border-t border-gray-200 pt-2">
                        <strong>Example:</strong> soap_note (1) → subjective (2)
                        → chief_complaint (3)
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                How nested this field is in response schema
              </p>
              <div className="relative">
                <select
                  value={selectedField.depth}
                  onChange={(e) =>
                    handleChange("depth", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none pr-10"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      Depth {level}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={selectedField.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 resize-none"
                placeholder="What is this field for? E.g. The patient's main reason for the visit."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
