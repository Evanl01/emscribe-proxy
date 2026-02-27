'use client';

import React, { useState } from 'react';
import LLMResponseTemplateBuilder from '@/src/components/LLMResponseTemplateBuilder/LLMResponseTemplateBuilder';
import BeforeYouStartOverlay from '@/src/components/BeforeYouStartOverlay';
import CommonErrorsOverlay from '@/src/components/CommonErrorsOverlay';

export default function NewLLMResponseTemplatePage() {
  const [isBeforeYouStartOpen, setIsBeforeYouStartOpen] = useState(false);
  const [isCommonErrorsOpen, setIsCommonErrorsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">LLM Response Template Builder</h1>
            <button
              onClick={() => setIsBeforeYouStartOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Tips before you start...
            </button>
          </div>
          <button
            onClick={() => console.log("Import Existing Templates clicked")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            title="Import existing templates"
          >
            Import Existing Templates
          </button>
        </div>
        <p className="text-gray-600">
          Create a custom template to control how the AI transcribes and outputs notes for your patient encounter.
        </p>
      </div>

      {/* LLM Response Template Builder */}
      <div className="bg-white rounded-lg">
        <LLMResponseTemplateBuilder />
      </div>

      {/* Before You Start Overlay */}
      <BeforeYouStartOverlay
        isOpen={isBeforeYouStartOpen}
        onClose={() => setIsBeforeYouStartOpen(false)}
        onOpenCommonErrors={() => {
          setIsBeforeYouStartOpen(false);
          setIsCommonErrorsOpen(true);
        }}
      />

      {/* Common Errors Overlay */}
      <CommonErrorsOverlay
        isOpen={isCommonErrorsOpen}
        onClose={() => setIsCommonErrorsOpen(false)}
        onOpenBeforeYouStart={() => {
          setIsCommonErrorsOpen(false);
          setIsBeforeYouStartOpen(true);
        }}
      />
    </div>
  );
}
