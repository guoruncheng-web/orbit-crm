"use client";

import { X } from "lucide-react";
import { Customer } from "@/lib/api";
import { money } from "@/lib/format";
import { Modal } from "./modal";

export function ConfirmDelete({
  customer,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  customer: Customer;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      role="alertdialog"
      labelledBy="confirm-delete-title"
      onClose={onCancel}
    >
      <div className="modal-head">
        <div>
          <p className="eyebrow">Delete customer</p>
          <h2 id="confirm-delete-title">Remove {customer.name}?</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Close"
        >
          <X />
        </button>
      </div>

      <p className="modal-copy">
        {customer.company} leaves your book along with its{" "}
        {money(customer.value)} of contract value. This cannot be undone.
      </p>

      {error instanceof Error && <p className="form-error">{error.message}</p>}

      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Keep customer
        </button>
        <button
          type="button"
          className="primary danger"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Deleting…" : "Delete customer"}
        </button>
      </div>
    </Modal>
  );
}
