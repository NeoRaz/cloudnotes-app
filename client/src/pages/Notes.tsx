import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { getRequest, postRequest, getFileRequest } from '../api/api';
import { Note, Selection } from '../types';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export const Notes: React.FC = () => {
  // Notes and utilities lists
  const [notes, setNotes] = useState<Note[]>([]);
  const [statuses, setStatuses] = useState<Selection[]>([]);
  const [priorities, setPriorities] = useState<Selection[]>([]);

  // Selected note for modal views
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'create' | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<number | null>(null);
  const [filterPinned, setFilterPinned] = useState<boolean | null>(null);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit / Create Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formStatus, setFormStatus] = useState<number>(1);
  const [formPriority, setFormPriority] = useState<number>(2);
  const [formDueDate, setFormDueDate] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [formAttachment, setFormAttachment] = useState<File | null>(null);
  const [deleteAttachment, setDeleteAttachment] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  // Fast Lookup Maps
  const statusMap = useMemo(() => {
    return Object.fromEntries(statuses.map((s) => [s.id, s.name]));
  }, [statuses]);

  const priorityMap = useMemo(() => {
    return Object.fromEntries(priorities.map((p) => [p.id, p.name]));
  }, [priorities]);

  const loadData = async () => {
    try {
      const [notesData, statusesData, prioritiesData] = await Promise.all([
        getRequest('/note/all-user-notes'),
        getRequest('/utility/all-statuses'),
        getRequest('/utility/all-priorities'),
      ]);

      setNotes(notesData || []);
      setStatuses(statusesData || []);
      setPriorities(prioritiesData || []);
    } catch {
      toast.error('Failed to load notes data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  // Filter notes
  const filteredNotes = useMemo(() => {
    let list = [...notes];

    // Status filter
    if (filterStatus !== null) {
      list = list.filter((n) => n.status_id === filterStatus);
    }

    // Priority filter
    if (filterPriority !== null) {
      list = list.filter((n) => n.priority_id === filterPriority);
    }

    // Pinned filter
    if (filterPinned !== null) {
      list = list.filter((n) => !!n.is_pinned === filterPinned);
    }

    // Search query
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.description?.toLowerCase().includes(query)
      );
    }

    // Sorting
    list.sort((a, b) => {
      // Pinned notes always stick to the top if not sorting strictly
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      if (sortBy === 'date-desc') {
        return (b.id || 0) - (a.id || 0);
      }
      if (sortBy === 'date-asc') {
        return (a.id || 0) - (b.id || 0);
      }
      if (sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'title-desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (sortBy === 'priority-desc') {
        return (b.priority_id || 0) - (a.priority_id || 0);
      }
      if (sortBy === 'priority-asc') {
        return (a.priority_id || 0) - (b.priority_id || 0);
      }
      return 0;
    });

    return list;
  }, [notes, search, sortBy, filterStatus, filterPriority, filterPinned]);

  const openCreateModal = () => {
    setFormTitle('');
    setFormContent('');
    setFormStatus(statuses[0]?.id || 1);
    setFormPriority(priorities[1]?.id || 2);
    setFormDueDate('');
    setFormPinned(false);
    setFormAttachment(null);
    setDeleteAttachment(false);
    setTitleError('');
    setTitleTouched(false);
    setModalType('create');
  };

  const openEditModal = (note: Note) => {
    setActiveNote(note);
    setFormTitle(note.title || '');
    setFormContent(note.description || '');
    setFormStatus(note.status_id || 1);
    setFormPriority(note.priority_id || 2);
    setFormDueDate(note.due_date ? new Date(note.due_date).toISOString().split('T')[0] : '');
    setFormPinned(!!note.is_pinned);
    setFormAttachment(null);
    setDeleteAttachment(false);
    setTitleError('');
    setTitleTouched(false);
    setModalType('edit');
  };

  const openViewModal = (note: Note) => {
    setActiveNote(note);
    setModalType('view');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleTouched(true);
    if (!formTitle.trim()) {
      setTitleError('Title is required');
      toast.error('Title is required');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle);
      formData.append('description', formContent);
      formData.append('status_id', String(formStatus));
      formData.append('priority_id', String(formPriority));
      if (formDueDate) {
        formData.append('due_date', formDueDate);
      }
      formData.append('is_pinned', formPinned ? '1' : '0');
      if (formAttachment) {
        formData.append('attachment', formAttachment);
      }
      if (deleteAttachment) {
        formData.append('delete_attachment', '1');
      }

      if (modalType === 'create') {
        const response = await postRequest('/note/create', formData);
        setNotes((prev) => [response, ...prev]);
        toast.success('Note created successfully');
      } else if (modalType === 'edit' && activeNote?.id) {
        const response = await postRequest(`/note/update/${activeNote.id}`, formData);
        setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? response : n)));
        toast.success('Note updated successfully');
      }
      setModalType(null);
    } catch {
      toast.error('Failed to save note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    const result = await Swal.fire({
      title: 'Delete Note?',
      text: 'This note and its attachments will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Yes, delete',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    });

    if (result.isConfirmed) {
      try {
        await postRequest(`/note/delete/${noteId}`);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success('Note deleted successfully');
      } catch {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleDownloadAttachment = async (note: Note) => {
    if (!note.id) return;
    toast.loading('Downloading attachment...', { id: 'download' });
    try {
      await getFileRequest(
        `note/download/${note.id}`,
        {},
        note.attachment_name || 'document.pdf'
      );
      toast.success('Download complete', { id: 'download' });
    } catch {
      toast.error('Failed to download attachment', { id: 'download' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">My Notes</h2>
          <p className="text-text-secondary text-sm">Organize and search your encrypted documents.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all shadow-md shadow-accent/15 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <i className="ti ti-plus" />
          Add New Note
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter Sidebar */}
        <div className="w-full md:w-60 shrink-0 space-y-5">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-light-card dark:shadow-none">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <i className="ti ti-filter text-accent" />
              Filter By
            </h3>

            {/* Categories */}
            <div className="space-y-1 mb-4 pb-4 border-b border-border/50">
              <button
                onClick={() => {
                  setFilterPinned(null);
                  setFilterStatus(null);
                  setFilterPriority(null);
                }}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  filterPinned === null && filterStatus === null && filterPriority === null
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background'
                }`}
              >
                <span>All Notes</span>
                <span className="text-xs bg-surface/50 border border-border px-1.5 py-0.5 rounded-full font-mono">
                  {notes.length}
                </span>
              </button>

              <button
                onClick={() => setFilterPinned(true)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  filterPinned === true
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background'
                }`}
              >
                <span className="flex items-center gap-1.5">📌 Pinned</span>
                <span className="text-xs bg-surface/50 border border-border px-1.5 py-0.5 rounded-full font-mono">
                  {notes.filter((n) => n.is_pinned).length}
                </span>
              </button>
            </div>

            {/* Statuses */}
            <div className="space-y-1 mb-4 pb-4 border-b border-border/50">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Status</h4>
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilterStatus(filterStatus === s.id ? null : s.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    filterStatus === s.id
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-xs bg-surface/50 border border-border px-1.5 py-0.5 rounded-full font-mono">
                    {notes.filter((n) => n.status_id === s.id).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Priorities */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Priority</h4>
              {priorities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFilterPriority(filterPriority === p.id ? null : p.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    filterPriority === p.id
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-xs bg-surface/50 border border-border px-1.5 py-0.5 rounded-full font-mono">
                    {notes.filter((n) => n.priority_id === p.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Grid Area */}
        <div className="flex-grow space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                <i className="ti ti-search text-lg" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes by title or content..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border focus:border-accent rounded-xl text-sm focus:outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-semibold text-text-secondary text-nowrap">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 bg-surface border border-border rounded-xl text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
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

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-surface/50 border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-16 bg-surface/30 border border-dashed border-border rounded-2xl">
              <i className="ti ti-file-text text-4xl text-text-secondary mb-2 block" />
              <p className="text-text-secondary text-sm">No notes match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openViewModal(note)}
                  className="group relative flex flex-col justify-between p-5 bg-surface border border-border rounded-2xl hover:border-accent/40 shadow-light-card dark:shadow-none hover:shadow-lg transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <h4 className="font-bold text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                        {note.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {note.is_pinned && <span className="text-amber-500">📌</span>}
                        {note.attachment_path && (
                          <span title="Has attachment" className="text-text-secondary text-sm">
                            <i className="ti ti-paperclip" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 text-[0.68rem] font-semibold bg-accent/10 text-accent border border-accent/20 rounded-md">
                        {statusMap[note.status_id || 1] || 'Draft'}
                      </span>
                      <span className="px-2 py-0.5 text-[0.68rem] font-semibold bg-background border border-border text-text-secondary rounded-md">
                        {priorityMap[note.priority_id || 2] || 'Normal'}
                      </span>
                    </div>

                    <div
                      className="text-xs text-text-secondary line-clamp-3 mb-4 font-serif leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(note.description || ''),
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-auto">
                    <span className="text-[0.68rem] text-text-secondary font-mono">
                      Due: {note.due_date ? new Date(note.due_date).toLocaleDateString() : 'N/A'}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(note)}
                        className="p-1.5 hover:bg-background text-text-secondary hover:text-text-primary rounded-lg border border-transparent hover:border-border transition-all"
                        title="Edit note"
                      >
                        <i className="ti ti-edit text-sm" />
                      </button>
                      <button
                        onClick={() => note.id && handleDeleteNote(note.id)}
                        className="p-1.5 hover:bg-red-500/5 text-text-secondary hover:text-red-500 rounded-lg border border-transparent hover:border-red-500/10 transition-all"
                        title="Delete note"
                      >
                        <i className="ti ti-trash text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODAL */}
      {modalType === 'view' && activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl p-6 flex flex-col max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-border pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{activeNote.title}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 text-[0.68rem] font-semibold bg-accent/10 text-accent border border-accent/20 rounded-md">
                    {statusMap[activeNote.status_id || 1]}
                  </span>
                  <span className="px-2 py-0.5 text-[0.68rem] font-semibold bg-background border border-border text-text-secondary rounded-md">
                    {priorityMap[activeNote.priority_id || 2]}
                  </span>
                  {activeNote.is_pinned && (
                    <span className="px-2 py-0.5 text-[0.68rem] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md">
                      Pinned
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-1.5 hover:bg-background rounded-lg border border-transparent hover:border-border text-text-secondary hover:text-text-primary"
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div
              className="flex-grow text-sm leading-relaxed text-text-primary font-serif mb-6 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeNote.description || '') }}
            />

            {activeNote.attachment_path && (
              <div className="p-3 bg-background border border-border rounded-xl mb-6">
                <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">
                  Attachment File
                </h5>
                <button
                  onClick={() => handleDownloadAttachment(activeNote)}
                  className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-background border border-border hover:border-accent/40 rounded-xl text-xs text-text-secondary hover:text-accent font-semibold transition-all shadow-sm"
                >
                  <i className="ti ti-file-text text-red-500 text-base" />
                  <span>{activeNote.attachment_name || 'Download PDF Attachment'}</span>
                  <i className="ti ti-download ml-2 text-text-secondary" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
              <span className="text-xs text-text-secondary font-mono">
                Due: {activeNote.due_date ? new Date(activeNote.due_date).toLocaleDateString() : 'No deadline'}
              </span>
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-accent/15"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(modalType === 'create' || modalType === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveNote}
            className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl p-6 flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                {modalType === 'create' ? 'Create New Note' : 'Edit Note'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1.5 hover:bg-background rounded-lg border border-transparent hover:border-border text-text-secondary hover:text-text-primary"
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="space-y-4 flex-grow">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (titleTouched) {
                      setTitleError(e.target.value.trim() ? '' : 'Title is required');
                    }
                  }}
                  onBlur={() => {
                    setTitleTouched(true);
                    setTitleError(formTitle.trim() ? '' : 'Title is required');
                  }}
                  className={`w-full px-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none transition-all ${
                    titleTouched && titleError ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
                  }`}
                  placeholder="Note Title *"
                />
                {titleTouched && titleError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <i className="ti ti-alert-circle text-sm" /> {titleError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
                  >
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border focus:border-accent rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Attachment (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormAttachment(e.target.files[0]);
                        setDeleteAttachment(false);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-sm focus:outline-none transition-all file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                  />

                  {modalType === 'edit' && activeNote?.attachment_name && !formAttachment && !deleteAttachment && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-background border border-border rounded-lg">
                      <span className="text-xs text-text-secondary truncate pr-2">
                        📎 {activeNote.attachment_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeleteAttachment(true)}
                        className="text-red-500 hover:text-red-600 text-xs font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {deleteAttachment && (
                    <div className="mt-2 text-xs text-red-500 flex items-center justify-between italic">
                      <span>Will delete existing PDF on save</span>
                      <button
                        type="button"
                        onClick={() => setDeleteAttachment(false)}
                        className="text-accent hover:underline font-semibold"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Content Description
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border focus:border-accent rounded-xl text-sm focus:outline-none transition-all resize-none"
                  rows={6}
                  placeholder="Enter note contents here..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="form-pin"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent border-border"
                />
                <label htmlFor="form-pin" className="text-sm text-text-primary font-medium cursor-pointer select-none">
                  Pin this note to the top of the repository dashboard
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-border pt-4 mt-6">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-background hover:bg-border text-text-secondary hover:text-text-primary text-sm font-semibold rounded-xl mr-3 transition-all border border-border"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-accent/15 flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Note'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

