'use client';

import React from 'react';
import SchemaBuilder from '@/src/components/SchemaBuilder/SchemaBuilder';

export default function NewResponseSchemaPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Response Schema Builder</h1>
        <p className="text-gray-600 mt-2">
          Create custom JSON schemas for LLM responses. Drag fields to order them and set their
          properties.
        </p>
      </div>

      {/* Schema Builder */}
      <div className="flex-1 bg-white rounded-lg shadow-sm">
        <SchemaBuilder />
      </div>
    </div>
  );
}
