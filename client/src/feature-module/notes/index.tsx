import React, { useEffect, useMemo, useState } from "react";
import Modal from "bootstrap/js/dist/modal";
import NotesHeader from "./partials/NotesHeader";
import NotesSidebar from "./partials/NotesSidebar";
import NotesContent from "./partials/NotesContent";
import NotesModal from "./partials/NotesModal";
import { Note } from "../../types/note";
import { Selection } from "../../types/selection";
import {
  getNotes,
  getStatuses,
  getPriorities,
  postUpdateNote,
  postDeleteNote,
  postCreateNote,
} from "./src/noteApis";
import toast from "react-hot-toast";

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [statuses, setStatuses] = useState<Selection[]>([]);
  const [priorities, setPriorities] = useState<Selection[]>([]);
  const [noteCounts, setNoteCounts] = useState({ all: 0, important: 0 });
  const [filters, setFilters] = useState<{
    important?: boolean;
    status?: number;
    priority?: number;
  }>({});

  // loaders separated
  const [pageLoading, setPageLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------- Load Notes, Statuses, Priorities ----------
  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      try {
        const [notesRes, statusesRes, prioritiesRes] = await Promise.all([
          getNotes(),
          getStatuses(),
          getPriorities(),
        ]);

        const list: Note[] = notesRes.data.data;
        setNotes(list);
        setNoteCounts({
          all: list.length,
          important: list.filter((n) => n.is_pinned).length,
        });

        setStatuses(
          statusesRes.data.data.map((item: any) => ({
            id: item.id,
            title: item.name,
          }))
        );

        setPriorities(
          prioritiesRes.data.data.map((item: any) => ({
            id: item.id,
            title: item.name,
          }))
        );
      } catch (err) {
        console.error("Failed fetching data", err);
        toast.error("Failed to load notes. Please try again.");
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------- Build maps for fast lookups ----------
  const statusMap = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.id, s.title])),
    [statuses]
  );
  const priorityMap = useMemo(
    () => Object.fromEntries(priorities.map((p) => [p.id, p.title])),
    [priorities]
  );

  // ---------- Filter ----------
  const filteredNotes = notes.filter((n) => {
    // important filter
    if (filters.important && !n.is_pinned) return false;

    // status filter
    if (filters.status && n.status_id !== filters.status) return false;

    // priority filter
    if (filters.priority && n.priority_id !== filters.priority) return false;

    return true;
  });


  // ---------- Modal helpers ----------
  const openModal = (id: string) => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      Modal.getOrCreateInstance(modalEl).show();
    }
  };
  const closeModal = (id: string) => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      const instance = Modal.getInstance(modalEl);
      instance?.hide();
    }
  };

  // ---------- Handlers ----------
  const handleEditClick = (note: Note) => {
    setSelectedNote(note);
    openModal("note-units");
  };

  const handleSave = async (note: Note) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", note.title);
      formData.append("description", note.description || "");
      formData.append("status_id", String(note.status_id));
      formData.append("priority_id", String(note.priority_id));
      if (note.due_date) formData.append("due_date", String(note.due_date));
      formData.append("is_pinned", note.is_pinned ? "1" : "0");
      if (note.attachment) {
        formData.append("attachment", note.attachment);
      }
      if (note.delete_attachment) {
        formData.append("delete_attachment", "1");
      }

      if (note.id) {
        const res: any = await postUpdateNote(note.id, formData);
        const updatedNote = res;
        setNotes((prev) => {
          const updated = prev.map((n) => (n.id === note.id ? updatedNote : n));
          setNoteCounts({
            all: updated.length,
            important: updated.filter((n) => n.is_pinned).length,
          });
          return updated;
        });
        toast.success("Note updated successfully");
      } else {
        const res: any = await postCreateNote(formData);
        const newNote = res;
        setNotes((prev) => {
          const updated = [...prev, newNote];
          setNoteCounts({
            all: updated.length,
            important: updated.filter((n) => n.is_pinned).length,
          });
          return updated;
        });
        toast.success("Note created successfully");
      }

      closeModal("note-units");
    } catch (err) {
      console.error("Failed to save note", err);
      toast.error("Failed to save note. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };


  const requestDelete = (note: Note) => {
    setNoteToDelete(note);
    openModal("delete-note-modal");
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    setDeleteLoading(true);
    try {
      await postDeleteNote(noteToDelete.id);
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
      setNoteCounts({
        all: notes.length - 1,
        important: notes.filter(
          (n) => n.is_pinned && n.id !== noteToDelete.id
        ).length,
      });
      toast.success("Note deleted successfully");
    } catch (err) {
      console.error("Failed to delete note", err);
      toast.error("Failed to delete note. Please try again.");
    } finally {
      setNoteToDelete(null);
      closeModal("delete-note-modal");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content pb-4">
        <NotesHeader onToggleSidebar={() => setSidebarOpen((s) => !s)} isSidebarOpen={isSidebarOpen} />

        <div className="row">
          <div
            className={`col-xl-3 col-md-4 col-12 ${
              isSidebarOpen ? "d-block" : "d-none"
            }`}
          >
            <NotesSidebar
              isOpen={isSidebarOpen}
              noteCounts={noteCounts}
              statuses={statuses}
              priorities={priorities}
              onFilterChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
              activeFilters={filters}
            />
          </div>

          <div
            className={isSidebarOpen ? "col-xl-9 col-md-8 col-12" : "col-12"}
          >
            {pageLoading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div className="page-loader mb-3"></div>
                <span className="text-secondary fw-semibold">Loading notes...</span>
              </div>
            ) : (
              <NotesContent
                notes={filteredNotes}
                onEdit={handleEditClick}
                onDelete={requestDelete}
                mapStatus={statusMap}
                mapPriority={priorityMap}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <NotesModal
        selectedNote={selectedNote}
        onSave={handleSave}
        onDelete={(id) => requestDelete({ id } as Note)}
        statuses={statuses}
        priorities={priorities}
        saving={actionLoading} // pass down
      />

      {/* Delete Confirmation Modal */}
      <div
        className="modal fade"
        id="delete-note-modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Delete Note</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => closeModal("delete-note-modal")}
              />
            </div>
            <div className="modal-body">
              Are you sure you want to delete this note? This cannot be undone.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() => closeModal("delete-note-modal")}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && (
                  <span className="spinner-border spinner-border-sm me-2" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;
