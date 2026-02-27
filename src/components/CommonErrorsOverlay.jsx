"use client";

import React from "react";
import { v4 as uuidv4 } from "uuid";
import FieldCard from "./LLMResponseTemplateBuilder/FieldCard";

const getSectionLevelColor = (section_level) => {
  const sectionLevelColors = {
    1: "#3b82f6", // blue-500
    2: "#22c55e", // green-500
    3: "#f59e0b", // amber-500
    4: "#ef4444", // red-500
    5: "#000000", // black
  };
  return sectionLevelColors[Math.min(Math.max(section_level || 1, 1), 5)];
};

const errorOutputWithLevels = [
  {
    id: uuidv4(),
    name: "patient_intake",
    section_level: 1,
    value: "",
  },
  {
    id: uuidv4(),
    name: "demographics",
    section_level: 2,
    value: "",
  },
  {
    id: uuidv4(),
    name: "first_name",
    section_level: 3,
    value: "John",
  },
  {
    id: uuidv4(),
    name: "last_name",
    section_level: 3,
    value: "Smith",
  },
  {
    id: uuidv4(),
    name: "contact_info",
    section_level: 2,
    value: "",
  },
  {
    id: uuidv4(),
    name: "phone",
    section_level: 3,
    value: "555-0123",
  },
  {
    id: uuidv4(),
    name: "email",
    section_level: 3,
    value: "john.smith@email.com",
  },
];

const incorrectOutputWithLevels = [
  {
    id: uuidv4(),
    name: "patient_intake",
    section_level: 1,
    value: "",
  },
  {
    id: uuidv4(),
    name: "demographics",
    section_level: 3,
    value: "",
  },
  {
    id: uuidv4(),
    name: "first_name",
    section_level: 4,
    value: "John",
  },
  {
    id: uuidv4(),
    name: "last_name",
    section_level: 4,
    value: "Smith",
  },
  {
    id: uuidv4(),
    name: "contact_info",
    section_level: 2,
    value: "",
  },
  {
    id: uuidv4(),
    name: "phone",
    section_level: 3,
    value: "555-0123",
  },
  {
    id: uuidv4(),
    name: "email",
    section_level: 3,
    value: "john.smith@email.com",
  },
];

export default function CommonErrorsOverlay({
  isOpen,
  onClose,
  onOpenBeforeYouStart,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay background, clickable to close */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        style={{ cursor: "pointer" }}
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-lg h-[85vh] overflow-hidden flex flex-col"
        style={{
          width: "98vw",
          maxWidth: "2020px",
          marginTop: "7rem",
          marginBottom: "5rem",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Common Errors</h2>

            <p>
              Rule:{" "}
              <span className="font-bold">
                Previous section levels cannot increase by more than 1{" "}
              </span>
              (1→2, 2→3 etc.)
            </p>
            <p className="text-gray-600 mt-1">
              Here, Template 2 is invalid – the{" "}
              <span style={{ color: "#f59e0b" }}>demographics</span> section
              incorrectly labelled section level 3, while the previous field {" "}
                <span style={{ color: "#3b82f6" }}>patient_intake</span> is section
                level 1. <span className="font-bold">(1→3 will error).</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Got it!
            </button>
            <button
              onClick={onOpenBeforeYouStart}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Before you start
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-4 p-6">
          {/* Left side - Field card examples */}
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
            {/* Output 1 */}
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Template 1 (Valid)
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                {errorOutputWithLevels.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      paddingLeft: `${Math.max(0, (field.section_level || 1) - 1) * 24}px`,
                    }}
                  >
                    <FieldCard
                      field={field}
                      isSelected={false}
                      onSelect={() => {}}
                      isInPreview={true}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Output 2 */}
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Template 2 (Invalid)
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                {incorrectOutputWithLevels.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      paddingLeft: `${Math.max(0, (field.section_level || 1) - 1) * 24}px`,
                    }}
                  >
                    <FieldCard
                      field={field}
                      isSelected={false}
                      onSelect={() => {}}
                      isInPreview={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Template structure and validation errors */}
          <div className="flex-1 overflow-y-auto pl-2 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Template 2 (Invalid)
            </h3>

            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded mb-4">
              <p className="text-sm font-medium text-red-800">
                ❌ Skipped Section level: Field 'demographics' is section_level
                3, and parent field 'patient_intake' is section_level 1. Add a
                section_level 2 field in between.
              </p>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: uuidv4(),
                  name: "patient_intake",
                  section_level: 1,
                  description: "Patient intake form",
                  required: false,
                },
                {
                  id: uuidv4(),
                  name: "demographics",
                  section_level: 3,
                  description: "Patient demographic information",
                  required: false,
                  isError: true,
                },
                {
                  id: uuidv4(),
                  name: "first_name",
                  section_level: 4,
                  description: "Patient first name",
                  required: false,
                },
                {
                  id: uuidv4(),
                  name: "last_name",
                  section_level: 4,
                  description: "Patient last name",
                  required: false,
                },
                {
                  id: uuidv4(),
                  name: "contact_info",
                  section_level: 2,
                  description: "Patient contact information",
                  required: false,
                },
                {
                  id: uuidv4(),
                  name: "phone",
                  section_level: 3,
                  description: "Patient phone number",
                  required: false,
                },
                {
                  id: uuidv4(),
                  name: "email",
                  section_level: 3,
                  description: "Patient email address",
                  required: false,
                },
              ].map((field) => (
                <div
                  key={field.id}
                  style={{
                    paddingLeft: `${Math.max(0, (field.section_level || 1) - 1) * 24}px`,
                  }}
                >
                  {field.isError ? (
                    <div
                      className="relative rounded-lg h-fit"
                      style={{
                        border: "2px dotted #ef4444",
                      }}
                    >
                      <FieldCard
                        field={field}
                        isSelected={false}
                        onSelect={() => {}}
                        isInPreview={true}
                      />
                    </div>
                  ) : (
                    <FieldCard
                      field={field}
                      isSelected={false}
                      onSelect={() => {}}
                      isInPreview={true}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
