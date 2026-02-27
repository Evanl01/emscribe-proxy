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
  onAddToTemplate,
}) {
  const [showSectionLevelModal, setShowSectionLevelModal] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const handleChange = (field, value) => {
    setAttemptedSubmit(false);
    onUpdateField({
      ...selectedField,
      [field]: value,
    });
  };

  // Check if field is already in preview
  const inPreview = selectedField && isFieldInPreview(selectedField.id);

  const isNameEmpty =
    !selectedField ||
    !selectedField.name ||
    selectedField.name.trim().length === 0;
  const isDescriptionEmpty =
    !selectedField ||
    !selectedField.description ||
    selectedField.description.trim().length === 0;

  const handleAddToTemplateClick = () => {
    if (!selectedField) {
      setAttemptedSubmit(true);
      alert("Please fill in all required fields marked with *");
      return;
    }
    if (isNameEmpty) {
      setAttemptedSubmit(true);
      alert("Please fill in all required fields marked with *");
      return;
    }
    if (isDescriptionEmpty) {
      setAttemptedSubmit(true);
      alert("Please fill in all required fields marked with *");
      return;
    }
    onAddToTemplate();
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Create new field button */}
      <button
        onClick={() => {
          onCreateField();
          setAttemptedSubmit(false);
        }}
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
                onClick={handleAddToTemplateClick}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors whitespace-nowrap"
                title="Add field to template"
              >
                Add to Template
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Field Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={selectedField.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-inset ${
                  attemptedSubmit && isNameEmpty
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="e.g., Chief complaint"
              />
            </div>

            {/* Section Level */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Section Level
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowSectionLevelModal(!showSectionLevelModal)
                    }
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors text-xs font-semibold"
                    title="Learn more about section level"
                  >
                    ?
                  </button>

                  {/* Dropdown Info */}
                  {showSectionLevelModal && (
                    <div
                      className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-90 z-50 text-sm text-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="font-medium">
                        Section Levels are similar to those used in a Microsoft Word document.
                      </p>
                      <p>E.g. Section, sub-Section, sub-sub Section etc. </p>
                      <p>--&gt; Section level 1, 2, 3 etc.` </p>
                      <p className="text-xs mb-1 mt-3 italic"> A patient intake form</p>
                      <div className="bg-gray-50 rounded p-2 text-xs font-mono mb-2 space-y-0">
                        <div className="flex justify-between pr-2">
                          <span className="font-medium text-blue-600">
                            patient_intake
                          </span>
                          <span>→ Section Level <strong>1</strong></span>
                        </div>
                        <div className="ml-[1.125rem] flex justify-between pr-2">
                          <span className="font-medium text-green-600">
                            demographics
                          </span>
                          <span>→ Section Level <strong>2</strong></span>
                        </div>
                        <div className="ml-9 flex justify-between pr-2">
                          <span className="font-medium text-amber-600">
                            first_name
                          </span>
                          <span>→ Section Level <strong>3</strong></span>
                        </div>
                        <div className="ml-9 flex justify-between pr-2">
                          <span className="font-medium text-amber-600">
                            last_name
                          </span>
                          <span>→ Section Level <strong>3</strong></span>
                        </div>
                        <div className="ml-[1.125rem] flex justify-between pr-2">
                          <span className="font-medium text-green-600">
                            contact_info
                          </span>
                          <span>→ Section Level <strong>2</strong></span>
                        </div>
                        <div className="ml-9 flex justify-between pr-2">
                          <span className="font-medium text-amber-600">
                            phone
                          </span>
                          <span>→ Section Level <strong>3</strong></span>
                        </div>
                        <div className="ml-9 flex justify-between pr-2">
                          <span className="font-medium text-amber-600">
                            email
                          </span>
                          <span>→ Section Level <strong>3</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                E.g. As used in a Microsoft Word document to organize section, sub-section, sub-sub section etc.
              </p>
              <div className="relative">
                <select
                  value={selectedField.section_level}
                  onChange={(e) =>
                    handleChange("section_level", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none pr-10"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      Section Level {level}
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
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={selectedField.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-inset resize-none ${
                  attemptedSubmit && isDescriptionEmpty
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="What is this field for? E.g. The patient's main reason for the visit."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
