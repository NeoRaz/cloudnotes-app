import React, { useState, useMemo } from "react";
import NoteCard from "./NoteCard";
import { Note } from "../../../types/note";
import { Selection } from "../../../types/selection";

interface Props {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  pageSize?: number;
  mapStatus: Record<Selection["id"], string>;
  mapPriority: Record<Selection["id"], string>;
}

const NotesContent: React.FC<Props> = ({ notes, onEdit, onDelete, pageSize = 15, mapStatus, mapPriority }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  // filter and sort notes
  const processedNotes = useMemo(() => {
    let result = [...notes];
    
    // 1. Search filter
    if (searchTerm.trim()) {
      result = result.filter(
        (note) =>
          note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Sorting logic
    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        const tA = a.id ? a.id : 0;
        const tB = b.id ? b.id : 0;
        return tB - tA;
      }
      if (sortBy === "date-asc") {
        const tA = a.id ? a.id : 0;
        const tB = b.id ? b.id : 0;
        return tA - tB;
      }
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortBy === "priority-desc") {
        return (b.priority_id || 0) - (a.priority_id || 0);
      }
      if (sortBy === "priority-asc") {
        return (a.priority_id || 0) - (b.priority_id || 0);
      }
      return 0;
    });

    return result;
  }, [notes, searchTerm, sortBy]);

  // pagination logic
  const totalPages = Math.ceil(processedNotes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentNotes = processedNotes.slice(startIndex, startIndex + pageSize);

  // reset page when search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center text-muted">
        No notes available. Add one to get started.
      </div>
    );
  }

  return (
    <div>
      {/* Search and Sort controls */}
      <div className="mb-4 d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <div className="flex-grow-1" style={{ maxWidth: "400px" }}>
          <div className="input-group">
            <span className="input-group-text bg-transparent border-end-0">
              <i className="ti ti-search text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <label className="text-secondary fw-semibold text-nowrap mb-0 fs-14">Sort By:</label>
          <select
            className="form-select border shadow-sm w-auto"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            style={{ minWidth: "180px", borderRadius: "8px" }}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="priority-asc">Priority (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Notes grid */}
      <div className="row">
        {currentNotes.length > 0 ? (
          currentNotes.map((note) => (
            <div className="col-md-6 col-xl-4 mb-4" key={note.id}>
              <NoteCard note={note} onEdit={onEdit} onDelete={onDelete} mapStatus={mapStatus} mapPriority={mapPriority}/>
            </div>
          ))
        ) : (
          <div className="text-center text-muted">No matching notes found.</div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav>
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
            </li>

            {[...Array(totalPages)].map((_, idx) => (
              <li
                key={idx}
                className={`page-item ${currentPage === idx + 1 ? "active" : ""}`}
              >
                <button className="page-link" onClick={() => setCurrentPage(idx + 1)}>
                  {idx + 1}
                </button>
              </li>
            ))}

            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default NotesContent;
