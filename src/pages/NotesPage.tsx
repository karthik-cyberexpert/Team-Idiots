"use client";

import * as React from "react";
import { NoteList } from "@/components/notes/NoteList";
import { NoteEditor } from "@/components/notes/NoteEditor";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const NotesPage = () => {
  const [selectedNote, setSelectedNote] = React.useState<Note | null | undefined>(undefined); // undefined for initial loading, null for new note

  const handleSelectNote = (note: Note | null) => {
    setSelectedNote(note);
  };

  const handleBackToList = () => {
    setSelectedNote(undefined); // Reset to undefined to trigger re-fetch or show list
  };

  return (
    <div className="flex flex-col h-full">
      {selectedNote === undefined ? (
        <NoteList onSelectNote={handleSelectNote} />
      ) : (
        <NoteEditor note={selectedNote} onBack={handleBackToList} />
      )}
    </div>
  );
};

export default NotesPage;