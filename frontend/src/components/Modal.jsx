import React, { useEffect } from "react";

export function Modal({ isOpen, onClose, children, maxWidth = "max-w-4xl" }) {
  useEffect(() => {
    if (!isOpen) return;
    const listener = (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-10  h-svh w-svw bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-lg shadow-xl ${maxWidth} max-h-[90vh] w-full mx-4 overflow-auto`}
      >
        {children}
      </div>
    </div>
  );
}
