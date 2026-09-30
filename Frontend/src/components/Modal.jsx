export default function Modal({
  open = true,
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose?.()
      }
    >
      <div
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camperops-modal-title"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">CAMPEROPS WORKFLOW</span>
            <h2 id="camperops-modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
