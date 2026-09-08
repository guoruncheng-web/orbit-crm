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
          <p className="eyebrow">删除客户</p>
          <h2 id="confirm-delete-title">确定删除 {customer.name}？</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="关闭"
        >
          <X />
        </button>
      </div>

      <p className="modal-copy">
        将从客户列表中移除 {customer.company} 及其 {money(customer.value)} 的合同金额，此操作无法撤销。
      </p>

      {error instanceof Error && <p className="form-error">{error.message}</p>}

      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          保留客户
        </button>
        <button
          type="button"
          className="primary danger"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "删除中…" : "确认删除"}
        </button>
      </div>
    </Modal>
  );
}
