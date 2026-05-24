import React from "react";
import { Selection } from "../../../types/selection";

interface Filters {
  important?: boolean;
  status?: number;
  priority?: number;
}

interface Props {
  isOpen: boolean;
  noteCounts: { all: number; important: number };
  statuses: Selection[];
  priorities: Selection[];
  onFilterChange: (filter: Partial<Filters>) => void;
  activeFilters: Filters;
}

const NotesSidebar: React.FC<Props> = ({
  isOpen,
  noteCounts,
  statuses,
  priorities,
  onFilterChange,
  activeFilters,
}) => {
  return (
    <div className="stickybar">
      <div className="card no-hover mt-4 p-3">
        <div className="mb-3 pb-3 border-bottom">
          <h4 className="d-flex align-items-center">
            <i className="ti ti-file-text me-2" /> List
          </h4>
        </div>

        {/* Main categories */}
        <div className="border-bottom pb-3">
          <div className="nav flex-column nav-pills" role="tablist">
            <button
              className={`d-flex text-start align-items-center fw-semibold fs-15 nav-link mb-1 ${
                !activeFilters.important && !activeFilters.status && !activeFilters.priority
                  ? "active"
                  : ""
              }`}
              onClick={() => onFilterChange({ important: undefined, status: undefined, priority: undefined })}
            >
              <i className="ti ti-inbox me-2" /> All Notes
              <span className="ms-2">{noteCounts.all}</span>
            </button>

            <button
              className={`d-flex text-start align-items-center fw-semibold fs-15 nav-link mb-1 ${
                activeFilters.important ? "active" : ""
              }`}
              onClick={() =>
                onFilterChange({
                  important: activeFilters.important ? undefined : true,
                })
              }
            >
              <i className="ti ti-star me-2" /> Important
              <span className="ms-2">{noteCounts.important}</span>
            </button>
          </div>
        </div>

        {/* Statuses */}
        <div className="mt-3">
          <div className="border-bottom px-2 pb-3 mb-3">
            <h5 className="mb-2">Statuses</h5>
            <div className="d-flex flex-column mt-2">
              {statuses.map((t) => (
                <button
                  key={t.id}
                  className={`btn btn-sm text-start mb-2 ${
                    activeFilters.status === t.id
                      ? "fw-bold text-info"
                      : "text-secondary"
                  }`}
                  onClick={() =>
                    onFilterChange({
                      status: activeFilters.status === t.id ? undefined : t.id,
                    })
                  }
                >
                  <i className="ti ti-square-filled me-2" />{" "}
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div className="px-2">
            <h5 className="mb-2">Priority</h5>
            <div className="d-flex flex-column mt-2">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  className={`btn btn-sm text-start mb-2 ${
                    activeFilters.priority === p.id
                      ? "fw-bold text-warning"
                      : "text-secondary"
                  }`}
                  onClick={() =>
                    onFilterChange({
                      priority:
                        activeFilters.priority === p.id ? undefined : p.id,
                    })
                  }
                >
                  <i className="ti ti-square-filled me-2" />{" "}
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesSidebar;
