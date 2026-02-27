"use client";
import { useState, useMemo, useEffect } from "react";

/**
 * Convert flat preview fields array into hierarchical JSON structure
 * Fields with section_level > 1 nest under their nearest parent (lower section_level)
 */
function buildHierarchicalJson(fields) {
  if (!fields || fields.length === 0) return {};

  const result = {};
  const stack = [{ section_level: 0, obj: result }]; // Stack to track nesting context

  fields.forEach((field) => {
    // Pop from stack until we find the parent section_level
    while (stack.length > 1 && stack[stack.length - 1].section_level >= field.section_level) {
      stack.pop();
    }

    const parentObj = stack[stack.length - 1].obj;
    const fieldObj = {};

    // Add description if it exists (trimmed)
    if (field.description && field.description.trim()) {
      fieldObj.description = field.description.trim();
    }

    parentObj[field.name.trim()] = fieldObj;

    // If this field might have children (not the last field), add it to stack
    stack.push({ section_level: field.section_level, obj: fieldObj });
  });

  return result;
}

/**
 * Convert hierarchical JSON to OpenAI strict JSON schema format
 * Preserves the order from previewFields array
 */
function buildOpenAISchema(hierarchicalJson, previewFields) {
  console.log("=== buildOpenAISchema START ===");
  console.log("previewFields order:", previewFields.map(f => ({ id: f.id, name: f.name, section_level: f.section_level })));

  // Helper to check if an object has real children (properties other than "description")
  const hasRealChildren = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    return Object.keys(obj).some((k) => k !== "description");
  };

  const buildPropertySchema = (obj, section_level = 1) => {
    const properties = {};
    const required = [];

    Object.entries(obj).forEach(([key, value]) => {
      // Skip description - it's metadata, not a property to require
      if (key === "description") {
        return;
      }
      required.push(key);

      if (hasRealChildren(value)) {
        // This field has real children - it's an object type
        const subProperties = {};
        const subRequired = [];

        Object.entries(value).forEach(([subKey, subVal]) => {
          if (subKey === "description") {
            // Skip description, it's not a property
            return;
          }
          subRequired.push(subKey);

          if (hasRealChildren(subVal)) {
            // Nested object with children
            subProperties[subKey] = {
              type: "object",
              additionalProperties: false,
              ...(subVal.description && { description: subVal.description }),
              properties: buildPropertySchema(subVal, section_level + 1).properties,
              required: buildPropertySchema(subVal, section_level + 1).required,
            };
          } else {
            // Leaf node - string type
            subProperties[subKey] = {
              type: "string",
              ...(subVal?.description && { description: subVal.description }),
            };
          }
        });

        properties[key] = {
          type: "object",
          additionalProperties: false,
          ...(value.description && { description: value.description }),
          properties: subProperties,
          required: subRequired,
        };
      } else {
        // Leaf node - string type
        properties[key] = {
          type: "string",
          ...(value?.description && { description: value.description }),
        };
      }
    });

    return { properties, required };
  };

  // Get root-level fields (section_level=1) in the order they appear in previewFields
  const rootFields = previewFields.filter((f) => f.section_level === 1);
  console.log("rootFields in order:", rootFields.map(f => ({ id: f.id, name: f.name })));

  // Build properties in previewFields order, not object key order
  const properties = {};
  const required = [];

  rootFields.forEach((field) => {
    console.log(`Processing field: id=${field.id}, name=${field.name}`);
    
    if (hierarchicalJson.hasOwnProperty(field.name)) {
      const fieldData = hierarchicalJson[field.name];
      console.log(`  Found in hierarchicalJson, hasChildren=${hasRealChildren(fieldData)}`);
      
      required.push(field.name);

      if (hasRealChildren(fieldData)) {
        // Object with children
        const { properties: subProps, required: subReq } = buildPropertySchema(fieldData);
        properties[field.name] = {
          type: "object",
          additionalProperties: false,
          ...(fieldData.description && { description: fieldData.description }),
          properties: subProps,
          required: subReq,
        };
      } else {
        // Leaf node
        properties[field.name] = {
          type: "string",
          ...(fieldData?.description && { description: fieldData.description }),
        };
      }
    } else {
      console.warn(`  Field not found in hierarchicalJson: ${field.name}`);
    }
  });

  console.log("Final properties order:", Object.keys(properties));

  // Determine schema name based on section_level=1 fields
  const schemaName =
    rootFields.length === 1 ? rootFields[0].name : "response_template";

  console.log("=== buildOpenAISchema END ===\n");

  return {
    response_format: {
      type: "json_schema",
      json_schema: {
        strict: true,
        name: schemaName,
        schema: {
          type: "object",
          properties,
          required,
          additionalProperties: false,
        },
      },
    },
  };
}

/**
 * Render JSON with syntax highlighting and colors
 * Uses previewFields order to ensure proper field ordering
 * - Field names: Red
 * - "description" key: Amber
 * - Values: Black
 * - Indentation based on nesting level
 * - Skip outer enclosing braces
 */
function JsonRenderer({ json, previewFields = [] }) {
  // Get root fields in order from previewFields
  const rootFieldOrder = previewFields.filter(f => f.section_level === 1).map(f => f.name);
  
  const renderValue = (value, section_level = 0) => {
    const indentStr = "  ".repeat(section_level);
    const nextIndentStr = "  ".repeat(section_level + 1);

    if (value === null || value === undefined) {
      return <span className="text-black">null</span>;
    }

    if (typeof value === "string") {
      return <span className="text-black">"{value}"</span>;
    }

    if (typeof value === "boolean") {
      return <span className="text-black">{value ? "true" : "false"}</span>;
    }

    if (typeof value === "object") {
      if (section_level === 0) {
        // Root level: use rootFieldOrder to determine rendering order
        return (
          <>
            {rootFieldOrder.map((fieldName, idx) => {
              const val = json[fieldName];
              return (
                <div key={fieldName}>
                  <span className="text-black">{nextIndentStr}</span>
                  <span className="text-red-600 font-semibold">{fieldName}</span>
                  <span className="text-black">: </span>
                  {typeof val === "object" && val !== null && Object.keys(val).some(k => k !== "description") ? (
                    <>
                      <span className="text-black">{"{"}</span>
                      <br />
                      {Object.entries(val).map(([subKey, subVal], subIdx) => (
                        <div key={subKey}>
                          <span className="text-black">{"  ".repeat(depth + 2)}</span>
                          {subKey === "description" ? (
                            <span className="text-amber-400 font-semibold">{subKey}</span>
                          ) : (
                            <span className="text-red-600 font-semibold">{subKey}</span>
                          )}
                          <span className="text-black">: </span>
                          {renderValue(subVal, depth + 2)}
                          {subIdx < Object.keys(val).length - 1 && (
                            <span className="text-black">,</span>
                          )}
                          <br />
                        </div>
                      ))}
                      <span className="text-black">{"  ".repeat(depth + 1)}{"}"}</span>
                    </>
                  ) : (
                    renderValue(val, depth + 1)
                  )}
                  {idx < rootFieldOrder.length - 1 && <span className="text-black">,</span>}
                  <br />
                </div>
              );
            })}
          </>
        );
      }

      // Nested objects - use normal iteration
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-black">{"{}"}</span>;
      }

      return (
        <>
          <span className="text-black">{"{"}</span>
          <br />
          {entries.map(([key, val], idx) => (
            <div key={key}>
              <span className="text-black">{nextIndentStr}</span>
              {key === "description" ? (
                <span className="text-amber-400 font-semibold">{key}</span>
              ) : (
                <span className="text-red-600 font-semibold">{key}</span>
              )}
              <span className="text-black">: </span>
              {renderValue(val, depth + 1)}
              {idx < entries.length - 1 && <span className="text-black">,</span>}
              <br />
            </div>
          ))}
          <span className="text-black">{indentStr}{"}"}</span>
        </>
      );
    }

    return <span className="text-black">{String(value)}</span>;
  };

  return (
    <div className="font-mono text-sm whitespace-pre-wrap break-words">
      {renderValue(json)}
    </div>
  );
}

export default function LLMResponseTemplateReviewOverlay({
  isOpen,
  onClose,
  previewFields = [],
  onSave,
  isSaving = false,
  errorMessage = "",
}) {
  const jsonData = useMemo(() => buildHierarchicalJson(previewFields), [previewFields]);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
    //   console.log("=== OVERLAY OPENED ===");
    //   console.log("previewFields received:", previewFields.map(f => ({ id: f.id, name: f.name, depth: f.depth })));
    //   console.log("previewFields order (names):", previewFields.map(f => f.name));
    //   console.log("jsonData keys order:", Object.keys(jsonData));
    //   console.log("jsonData:", jsonData);
    }
  }, [isOpen, previewFields, jsonData]);

  const handleSave = () => {
    console.log("=== SAVE BUTTON CLICKED ===");
    console.log("previewFields at save:", previewFields.map(f => ({ id: f.id, name: f.name, depth: f.depth })));
    
    // Build the OpenAI strict JSON schema
    const openAISchema = buildOpenAISchema(jsonData, previewFields);
    
    // Log final schema order
    console.log("Final schema properties order:", Object.keys(openAISchema.response_format.json_schema.schema.properties));
    console.log("OpenAI JSON Schema:", JSON.stringify(openAISchema, null, 2));
    
    // Call the parent callback
    onSave?.(openAISchema);
  };

  const handleClose = () => {
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay background, clickable to close */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        style={{ cursor: "pointer" }}
        onClick={handleClose}
      />

      <div
        className="relative bg-white rounded-lg h-[85vh] flex flex-col"
        style={{
          width: "98vw",
          maxWidth: "2020px",
          marginTop: "7rem",
          marginBottom: "5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-400">
          <h2 className="text-2xl font-bold">Review LLM Response Template:</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-5xl"
          >
            ×
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row h-0 min-h-0">
          {/* Left side - JSON Preview (full width on this view) */}
          <div className="flex-1 p-6 h-full overflow-y-auto min-w-0">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-300 overflow-auto">
              <JsonRenderer json={jsonData} previewFields={previewFields} />
            </div>
          </div>

          {/* Right side - Save Button */}
          <div className="w-full lg:w-80 p-6 flex flex-col bg-gray-50 border-l border-black">
            <div className="flex-1 flex flex-col justify-end gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Review your LLM response template structure. Field names are shown in{" "}
                  <span className="text-red-600 font-semibold">red</span>, description keys in{" "}
                  <span className="text-amber-400 font-semibold">amber</span>.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full px-6 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white ${
                  isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSaving ? "Saving..." : "Save Template"}
              </button>

              {errorMessage && (
                <div className="text-red-600 text-sm">{errorMessage}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
