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

const sampleTemplateFields = [
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
    section_level: 2,
    description: "Patient demographic information",
    required: false,
  },
  {
    id: uuidv4(),
    name: "first_name",
    section_level: 3,
    description: "Patient first name",
    required: false,
  },
  {
    id: uuidv4(),
    name: "last_name",
    section_level: 3,
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
];

const sampleOutput = {
  patient_intake: "",
  demographics: "",
  first_name: "John",
  last_name: "Smith",
  contact_info: "",
  phone: "555-0123",
  email: "john.smith@email.com",
};

export default function BeforeYouStartOverlay({ isOpen, onClose, onOpenCommonErrors }) {
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
            <h2 className="text-2xl font-bold text-gray-900">
              Before you start...
            </h2>
            <p className="text-gray-600 mt-1">
              Imagine you AI-generate a patient intake form. See how it matches up against your template structure.
            </p>
            <div className="text-gray-700 mt-1.5 space-y-1">
              <p>
                <span style={{ color: "#ef4444" }}>Section Levels</span> are similar to those in a Microsoft Word document. They help organize the AI output, for example: 
              </p>
              <p>
                This is a {" "}
                <span style={{ color: "#3b82f6" }}>patient_intake</span> form. <span style={{ color: "#22c55e" }}>demographics</span> is
                a subsection of <span style={{ color: "#3b82f6" }}>patient_intake</span> (section level 1 → 2), and{" "}
                <span style={{ color: "#f59e0b" }}>first_name</span> is a
                subsection of <span style={{ color: "#22c55e" }}>demographics</span> (section level 2 → 3).
              </p>
              <p>
                <span style={{ color: "#22c55e" }}>contact_info</span> is also a
                subsection of{" "}
                <span style={{ color: "#3b82f6" }}>patient_intake</span> (section level 1 →
                2). It shares the same parent level as <span style={{ color: "#22c55e" }}>demographics</span>
              </p>
              <p>You can use the formula:{"  "}
                <span className="font-bold">section level = parent section + 1</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Got it, let's build!
            </button>
            <button
              onClick={onOpenCommonErrors}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Common Errors
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-4 p-6">
          {/* Left side - Sample output as text with indentation */}
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              AI-Generated Output
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-300 flex-1 overflow-y-auto">
              <div className="font-mono text-sm whitespace-pre-wrap">
                {sampleTemplateFields.map((field) => {
                  const value = sampleOutput[field.name];
                  const indent =
                    Math.max(0, (field.section_level || 1) - 1) * 2;
                  const color = getSectionLevelColor(field.section_level);
                  return (
                    <div
                      key={field.id}
                      style={{ color, paddingLeft: `${indent * 8}px` }}
                    >
                      {field.name}: {value}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right side - Template preview */}
          <div className="flex-1 overflow-y-auto pl-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Template Structure
            </h3>
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              {sampleTemplateFields.map((field) => (
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
      </div>
    </div>
  );
}
