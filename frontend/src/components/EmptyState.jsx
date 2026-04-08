import React from "react";
import { Icon } from "./Sidebar";

function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="btn-primary" onClick={onAction}
          style={{padding:"10px 24px", fontSize:"14px"}}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;


