import React, { useState } from "react";
import { exportDataAsFile } from "@/src/utils/exportDataAsFile";

export default function ExportDataAsFileMenu({ encounterData }) {
  const [show, setShow] = useState(false);

  const handleExport = async (type) => {
    await exportDataAsFile(encounterData, type);
    setShow(false);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button className="bg-gray-200 px-4 py-2 rounded-lg font-medium">
        Export As ...
      </button>
      {show && (
        <div className="absolute left-0 mt-2 flex gap-2 z-10">
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={() => handleExport("pdf")}
          >
            PDF
          </button>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded"
            onClick={() => handleExport("word")}
          >
            Word
          </button>
        </div>
      )}
    </div>
  );
}