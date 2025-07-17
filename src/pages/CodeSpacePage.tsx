"use client";

import * as React from "react";
import { CodeDocumentList } from "@/components/codespace/CodeDocumentList";
import { CodeEditor } from "@/components/codespace/CodeEditor";
import { CodeDocument } from "@/types/codeDocument";

const CodeSpacePage = () => {
  const [selectedDocument, setSelectedDocument] = React.useState<CodeDocument | null | undefined>(undefined); // undefined for initial loading, null for new document

  const handleSelectDocument = (document: CodeDocument | null) => {
    setSelectedDocument(document);
  };

  const handleBackToList = () => {
    setSelectedDocument(undefined); // Reset to undefined to trigger re-fetch or show list
  };

  return (
    <div className="flex flex-col h-full">
      {selectedDocument === undefined ? (
        <CodeDocumentList onSelectDocument={handleSelectDocument} />
      ) : (
        <CodeEditor document={selectedDocument} onBack={handleBackToList} />
      )}
    </div>
  );
};

export default CodeSpacePage;