import React, { useState } from "react";
import { Note } from "../../../types/note";
import { Modal } from "react-bootstrap";
import DOMPurify from "dompurify";
import { Selection } from "../../../types/selection";
import { getFileRequest } from "../../../api/api";

// CRA injects REACT_APP_* via webpack DefinePlugin; declare process so TS is happy
declare const process: { env: Record<string, string | undefined> };

interface Props {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  mapStatus: Record<Selection["id"], string>;
  mapPriority: Record<Selection["id"], string>;
}

const NoteCard: React.FC<Props> = ({ note, onEdit, onDelete, mapStatus, mapPriority}) => {
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getStatusName = (id?: number) => (id ? mapStatus[id] ?? "" : "");
  const getPriorityName = (id?: number) => (id ? mapPriority[id] ?? "" : ""); 

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!note.id) return;
    
    setDownloading(true);
    try {
      await getFileRequest(
        `note/download/${note.id}`,
        {},
        note.attachment_name || "document.pdf"
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Card */}
      <div className="card h-100 shadow-sm">
        <div
          className="card-body d-flex flex-column"
          style={{ cursor: "pointer" }}
          onClick={() => setShowModal(true)}
        >
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h5 className="card-title mb-0">{note.title}</h5>
            <div className="d-flex gap-2">
              {note.attachment_path && (
                <span title="Has PDF attachment" className="text-muted">
                  <i className="ti ti-paperclip" />
                </span>
              )}
              {note.is_pinned && (
                <span className="badge bg-warning text-dark">📌</span>
              )}
            </div>
          </div>

          <div className="mb-2">
            <span className="badge bg-info me-1">{getStatusName(note.status_id)}</span>
            <span className="badge bg-secondary">{getPriorityName(note.priority_id)}</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-auto">
            <small className="text-muted">
              Due:{" "}
              {note.due_date
                ? new Date(note.due_date).toLocaleDateString()
                : "N/A"}
            </small>
            <div
              className="ms-2"
              onClick={(e) => e.stopPropagation()} // prevent modal from opening
            >
              <button
                type="button"
                className="btn btn-sm btn-outline-primary me-2"
                onClick={() => onEdit(note)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onDelete(note)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full View Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-bottom-0">
          <Modal.Title className="fw-bold">{note.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <div className="mb-3 d-flex gap-2">
            <span className="badge bg-info-subtle text-info border border-info-subtle">{getStatusName(note.status_id)}</span>
            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{getPriorityName(note.priority_id)}</span>
            {note.is_pinned && <span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pinned</span>}
          </div>

          <div
            className="mb-4"
            style={{
              maxHeight: "50vh",
              overflowY: "auto",
              fontSize: "1.05rem",
              lineHeight: "1.6"
            }}
          >
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(note.description),
              }}
            />
          </div>

          {note.attachment_path && (
            <div className="mt-4 p-3 bg-light rounded border">
               <h6 className="fw-bold mb-2 small text-uppercase text-muted">Attachments</h6>
               <button 
                onClick={handleDownload}
                className="btn btn-white btn-sm border d-inline-flex align-items-center gap-2 shadow-sm"
                disabled={downloading}
               >
                 <i className={`ti ${downloading ? 'spinner-border spinner-border-sm' : 'ti-file-text text-danger'} fs-5`} />
                 <span className="fw-medium">{note.attachment_name || 'Download PDF'}</span>
                 <i className="ti ti-download text-muted ms-1" />
               </button>
            </div>
          )}

          <div className="mt-4 text-muted small d-flex align-items-center gap-2">
            <i className="ti ti-calendar" />
            <strong>Due Date:</strong>{" "}
            {note.due_date
              ? new Date(note.due_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : "No deadline"}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-top-0">
          <button
            className="btn btn-primary px-4"
            onClick={() => setShowModal(false)}
          >
            Got it
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NoteCard;
