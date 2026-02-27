"use client";
import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import FieldCard from "./FieldCard";
import {
  validateFirstFieldSectionLevel,
  validateSectionLevelProgression,
  validateFieldIdUniqueness,
  validateRequiredProperties,
  validateSectionLevelRange,
} from "@/src/utils/llmResponseTemplateValidation";

const grid = 8;

// Sortable item component
function SortableFieldItem({
  field,
  selectedFieldId,
  onSelectField,
  onRemoveFieldFromPreview,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e) => {
    // Don't select if clicking delete button
    if (e.target.closest('[data-action="delete"]')) {
      return;
    }
    console.log('Field clicked, selecting', field.id);
    onSelectField(field.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        gap: '4px',
        marginBottom: '0px',
      }}
    >
      {/* Drag Handle - only this element has dnd-kit listeners */}
      <div
        {...attributes}
        {...listeners}
        style={{
          paddingTop: `${grid * 1}px`,
          paddingBottom: `${grid * 1}px`,
          paddingLeft: `${grid * 0.4}px`,
          paddingRight: `${grid * 0.2}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          flexShrink: 0,
        }}
        title="Drag to reorder"
      >
        <svg
          className="w-5 h-5 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <circle cx="6" cy="4" r="1.5" />
          <circle cx="14" cy="4" r="1.5" />
          <circle cx="6" cy="10" r="1.5" />
          <circle cx="14" cy="10" r="1.5" />
          <circle cx="6" cy="16" r="1.5" />
          <circle cx="14" cy="16" r="1.5" />
        </svg>
      </div>

      {/* Layout wrapper - handles flex and section_level indentation */}
      <div
        style={{
          flex: 1,
          paddingLeft: `${Math.max(0, (field.section_level || 1) - 1) * 24}px`,
          paddingTop: `${grid * 0.5}px`,
          paddingBottom: `${grid * 0.5}px`,
        }}
      >
        {/* Field Card - handles all visual styling */}
        <FieldCard
          field={field}
          isSelected={selectedFieldId === field.id}
          onSelect={onSelectField}
          onDelete={onRemoveFieldFromPreview}
          isInPreview
        />
      </div>
    </div>
  );
}

export default function PreviewBox({
  preview,
  selectedFieldId,
  onSelectField,
  onReorderFields,
  onRemoveFieldFromPreview,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Validation checks
  const sectionLevelValidation = validateFirstFieldSectionLevel(preview);
  const progressionValidation = validateSectionLevelProgression(preview);
  const idValidation = validateFieldIdUniqueness(preview);
  const requiredPropsValidation = validateRequiredProperties(preview);
  const sectionLevelRangeValidation = validateSectionLevelRange(preview);

  // Collect all validation errors
  const allValidations = [
    sectionLevelValidation,
    progressionValidation,
    idValidation,
    requiredPropsValidation,
    sectionLevelRangeValidation,
  ];

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = preview.findIndex((item) => item.id === active.id);
      const newIndex = preview.findIndex((item) => item.id === over.id);

      const newPreview = arrayMove(preview, oldIndex, newIndex);
      onReorderFields(newPreview);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className="flex flex-col h-full gap-4">
        <h2 className="text-lg font-semibold text-gray-900">LLM Response Template Builder</h2>

        {/* Scrollable container for errors and fields */}
        <div className="space-y-3 pr-2">
          {/* Validation Warning Banners */}
          {(!sectionLevelValidation.isValid || !progressionValidation.isValid || !idValidation.isValid || !requiredPropsValidation.isValid || !sectionLevelRangeValidation.isValid) && (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {!sectionLevelValidation.isValid && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="text-sm font-medium text-red-800">❌ {sectionLevelValidation.message}</p>
                </div>
              )}

              {!progressionValidation.isValid && (
                <div className="space-y-2">
                  {progressionValidation.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm font-medium text-red-800">❌ {error.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {!idValidation.isValid && (
                <div className="space-y-2">
                  {idValidation.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm font-medium text-red-800">❌ {error.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {!requiredPropsValidation.isValid && (
                <div className="space-y-2">
                  {requiredPropsValidation.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm font-medium text-red-800">❌ {error.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {!sectionLevelRangeValidation.isValid && (
                <div className="space-y-2">
                  {sectionLevelRangeValidation.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm font-medium text-red-800">❌ {error.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Fields List */}
          <SortableContext
          items={preview.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            style={{
              background: "#ffffff",
              padding: grid,
              width: "100%",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              minHeight: "60vh",
            }}
          >
            {preview.length === 0 ? (
              <p className="text-gray-400">Start by clicking Create new field, then Add to Template.</p>
            ) : (
              preview.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  selectedFieldId={selectedFieldId}
                  onSelectField={onSelectField}
                  onRemoveFieldFromPreview={onRemoveFieldFromPreview}
                />
              ))
            )}
          </div>
        </SortableContext>
        </div>
      </div>
    </DndContext>
  );
}
