import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Scrollbars from "react-custom-scrollbars-2";
import { userSidebarData } from "./structure/sidebarData";
import { SidebarItem } from "../../../types/SidebarItem";


const Sidebar: React.FC = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isActive = (path: string | undefined): boolean => {
    return !!path && location.pathname === path;
  };

  const handleMenuClick = (label: string) => {
    setOpenMenu(openMenu === label ? null : label);
  };

  return (
    <div className="sidebar" id="sidebar">
      <Scrollbars>
        <div className="sidebar-inner slimscroll">
          <div id="sidebar-menu" className="sidebar-menu">
            <ul>
              {userSidebarData.map((section, idx) => (
                <li key={idx}>
                  <h6 className="submenu-hdr">
                    <span>{section.label}</span>
                  </h6>
                  <ul>
                    {section.submenuItems?.map((item: SidebarItem) => (
                      <li
                        key={item.label}
                        className={`submenu ${
                          isActive(item.link) ? "active" : ""
                        }`}
                      >
                        <Link
                          to={item.link || "#"}
                          onClick={() =>
                            item.submenu
                              ? handleMenuClick(item.label)
                              : undefined
                          }
                          className={`d-flex align-items-center ${
                            openMenu === item.label ? "subdrop" : ""
                          }`}
                        >
                          {item.icon && <i className={item.icon}></i>}
                          <span className="ms-2">{item.label}</span>
                          {item.submenu && (
                            <span className="menu-arrow ms-auto"></span>
                          )}
                        </Link>

                        {/* Submenu items */}
                        {item.submenu && item.submenuItems && openMenu === item.label && (
                          <ul className="ms-4">
                            {item.submenuItems.map((sub: SidebarItem) => (
                              <li
                                key={sub.label}
                                className={`${isActive(sub.link) ? "active" : ""}`}
                              >
                                <Link to={sub.link || "#"}>{sub.label}</Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Scrollbars>
    </div>
  );
};

export default Sidebar;
