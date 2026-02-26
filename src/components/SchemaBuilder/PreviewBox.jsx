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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import FieldCard from "./FieldCard";

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
          paddingTop: `${grid * 2}px`,
          paddingBottom: `${grid * 2}px`,
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

      {/* Layout wrapper - handles flex and depth indentation */}
      <div
        style={{
          flex: 1,
          paddingLeft: `${Math.max(0, (field.depth || 1) - 1) * 24}px`,
          paddingTop: `${grid * 1}px`,
          paddingBottom: `${grid * 1}px`,
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
    >
      <div className="flex flex-col h-full gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Schema Builder</h2>

        <SortableContext
          items={preview.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            style={{
              background: "#f9fafb",
              padding: grid,
              width: "100%",
              flex: 1,
              borderRadius: "0.5rem",
              overflowY: "auto",
              border: "1px solid #e5e7eb",
            }}
          >
            {preview.length === 0 ? (
              <p>Create new field and Add to Schema to start building</p>
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
    </DndContext>
  );
}