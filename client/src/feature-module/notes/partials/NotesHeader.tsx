import React from "react";
import { Link } from "react-router-dom";

interface Props {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const NotesHeader: React.FC<Props> = ({ onToggleSidebar, isSidebarOpen }) => {
  return (
    <div className="d-md-flex d-block align-items-center justify-content-between mb-3 pb-3 border-bottom position-relative">
      <div className="my-auto mb-2 d-flex align-items-center gap-3">
        <Link
          id="toggle_btn2"
          className="btn btn-sm btn-outline-secondary rounded-circle d-inline-flex align-items-center justify-content-center"
          to="#"
          onClick={(e) => {
            e.preventDefault();
            onToggleSidebar();
          }}
          style={{ width: "32px", height: "32px" }}
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <i className={isSidebarOpen ? "ti ti-chevron-left fs-16" : "ti ti-chevron-right fs-16"} />
        </Link>
        <div>
          <h3 className="page-title mb-1">Notes</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">Core</li>
              <li className="breadcrumb-item active" aria-current="page">
                List
              </li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default NotesHeader;
