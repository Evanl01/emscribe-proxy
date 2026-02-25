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
    userSelect: "none",
    padding: grid * 2,
    margin: `0 0 ${grid}px 0`,
    paddingLeft: grid * 2 + (field.depth || 0) * 16,
    background: isDragging ? "lightblue" : "white",
    border: isDragging ? "2px solid #60a5fa" : "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <FieldCard
        field={field}
        isSelected={selectedFieldId === field.id}
        onSelect={onSelectField}
        onDelete={onRemoveFieldFromPreview}
        isInPreview
      />
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
      <div>
        <h2>Preview & Ordering</h2>

        <SortableContext
          items={preview.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            style={{
              background: "#f9fafb",
              padding: grid,
              width: "100%",
              minHeight: "200px",
              borderRadius: "0.5rem",
            }}
          >
            {preview.length === 0 ? (
              <p>Drag fields here to order them</p>
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