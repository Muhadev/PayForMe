import React from 'react';
import { Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
import './ProjectFilterTabs.css'; // Reuse the same CSS file

const BackedProjectFilterTabs = ({ activeFilter, setFilter }) => {
  // Define tab data with labels and icons specifically for backed projects
  const tabs = [
    { id: 'all', label: 'All Projects', icon: 'bi-collection' },
    { id: 'active', label: 'Active', icon: 'bi-play-circle' },
    { id: 'successful', label: 'Successful', icon: 'bi-trophy' },
    { id: 'failed', label: 'Failed', icon: 'bi-x-circle' }
  ];

  return (
    <Nav variant="tabs" className="project-tabs mb-4 flex-nowrap">
      {tabs.map(tab => (
        <Nav.Item key={tab.id} className="tab-item">
          {/* For mobile: Only show icon with tooltip */}
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id={`tooltip-${tab.id}`} className="d-md-none">{tab.label}</Tooltip>}
          >
            <Nav.Link 
              active={activeFilter === tab.id} 
              onClick={() => setFilter(tab.id)}
              className="nav-link-responsive"
            >
              <i className={`bi ${tab.icon} d-inline d-md-none`}></i>
              <span className="d-none d-md-inline">{tab.label}</span>
            </Nav.Link>
          </OverlayTrigger>
        </Nav.Item>
      ))}
    </Nav>
  );
};

export default BackedProjectFilterTabs;