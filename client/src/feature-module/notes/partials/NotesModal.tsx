import React, { useEffect, useState } from "react";
import { Note } from "../../../types/note";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Selection } from "../../../types/selection";

interface Props {
  selectedNote: Note | null;
  onSave: (note: Note) => void;
  onDelete: (id?: number) => void;
  statuses?: Selection[];
  priorities?: Selection[];
  saving?: boolean; // <-- NEW: tells if save is in progress
}

const NotesModal: React.FC<Props> = ({
  selectedNote,
  onSave,
  statuses,
  priorities,
  saving = false,
}) => {
  const [form, setForm] = useState<Note>({
    id: undefined,
    title: "",
    description: "",
    status_id: 1,
    priority_id: 2,
    due_date: "",
    is_pinned: false,
    delete_attachment: false,
  });

  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (selectedNote) {
      console.log("Selected Note:", selectedNote);
      const formattedDueDate = selectedNote.due_date
      ? new Date(selectedNote.due_date).toISOString().split("T")[0]
      : undefined;

      setForm({
        id: selectedNote.id,
        title: selectedNote.title || "",
        description: selectedNote.description || "",
        status_id: selectedNote.status_id || 1,
        priority_id: selectedNote.priority_id || 2,
        due_date: formattedDueDate,
        is_pinned: selectedNote.is_pinned || false,
        delete_attachment: false,
      });
    }
    setValidated(false); // reset validation when modal opens
  }, [selectedNote]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type, value } = e.target;
    const checked =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : undefined;

    setForm((p) => ({
      ...p,
      [name]:
        type === "checkbox"
          ? checked
          : ["status_id", "priority_id"].includes(name)
          ? Number(value)
          : value,
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!form.title.trim()) {
      setValidated(true);
      return; // stop modal from closing
    }

    onSave(form);
    setValidated(false); // reset validation on success
  };

  return (
    <div
      className="modal fade"
      id="note-units"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <form className="modal-content" onSubmit={handleSave}>
          <div className="modal-header">
            <h5 className="modal-title">
              {form.id ? "Edit Note" : "Add Note"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>

          <div className="modal-body">
            {/* Title */}
            <div className="mb-3">
              <label className="form-label fw-bold">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className={`form-control ${
                  validated && !form.title.trim() ? "is-invalid" : ""
                }`}
                placeholder="Note title"
              />
              {validated && !form.title.trim() && (
                <div className="invalid-feedback">Title is required.</div>
              )}
            </div>

            <div className="row g-3">
                {/* Status + Priority */}
                <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted small uppercase">Status</label>
                    <select
                    name="status_id"
                    value={form.status_id}
                    onChange={handleChange}
                    className="form-select"
                    >
                    <option value="">-- Select Status --</option>
                    {statuses?.map((s) => (
                        <option key={s.id} value={s.id}>
                        {s.title}
                        </option>
                    ))}
                    </select>
                </div>

                <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted small uppercase">Priority</label>
                    <select
                    name="priority_id"
                    value={form.priority_id}
                    onChange={handleChange}
                    className="form-select"
                    >
                    <option value="">-- Select Priority --</option>
                    {priorities?.map((p) => (
                        <option key={p.id} value={p.id}>
                        {p.title}
                        </option>
                    ))}
                    </select>
                </div>
            </div>

            <div className="row g-3">
                {/* Due Date */}
                <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted small uppercase">Due date</label>
                    <input
                        name="due_date"
                        type="date"
                        value={form.due_date ?? ""}
                        onChange={handleChange}
                        className="form-control"
                    />
                </div>

                {/* Attachment */}
                <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted small uppercase">Attachment (PDF)</label>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setForm(p => ({ ...p, attachment: e.target.files![0], delete_attachment: false }));
                            }
                        }}
                        className="form-control"
                    />
                    {selectedNote?.attachment_name && !form.attachment && !form.delete_attachment && (
                        <div className="mt-2 d-flex align-items-center justify-content-between p-2 bg-light rounded border">
                            <div className="small text-success text-truncate">
                                <i className="ti ti-paperclip me-1" />
                                {selectedNote.attachment_name}
                            </div>
                            <button 
                                type="button" 
                                className="btn btn-sm btn-outline-danger border-0"
                                onClick={() => setForm(p => ({ ...p, delete_attachment: true }))}
                                title="Remove document"
                            >
                                <i className="ti ti-trash" />
                            </button>
                        </div>
                    )}
                    {form.delete_attachment && (
                         <div className="mt-2 small text-danger italic">
                            <i className="ti ti-info-circle me-1" />
                            Document will be removed on update
                            <button 
                                type="button" 
                                className="btn btn-link btn-sm p-0 ms-2 text-decoration-none"
                                onClick={() => setForm(p => ({ ...p, delete_attachment: false }))}
                            >
                                Undo
                            </button>
                         </div>
                    )}
                </div>
            </div>

            {/* Description at the bottom with fixed height to avoid overlapping */}
            <div className="mb-4">
              <label className="form-label fw-bold">Content</label>
              <ReactQuill
                  theme="snow"
                  value={form.description}
                  className="note-quill-editor"
                  onChange={(val) =>
                  setForm((p) => ({ ...p, description: val }))
                  }
              />
              <style>{`
                .note-quill-editor .ql-container {
                    height: 200px;
                    overflow-y: auto;
                }
                .note-quill-editor .ql-editor {
                    min-height: 200px;
                }
              `}</style>
            </div>

            {/* Pinned */}
            <div className="form-check form-switch mt-2">
              <input
                name="is_pinned"
                id="pin-note-switch"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={!!form.is_pinned}
                onChange={handleChange}
              />
              <label className="form-check-label fw-medium" htmlFor="pin-note-switch">Pin this note</label>
            </div>
          </div>

          <div className="modal-footer border-top-0 pt-0">
            <button
              type="button"
              className="btn btn-light me-2"
              data-bs-dismiss="modal"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 shadow-sm"
              disabled={saving}
            >
              {saving && (
                <span className="spinner-border spinner-border-sm me-2" />
              )}
              {form.id ? "Update Note" : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotesModal;
