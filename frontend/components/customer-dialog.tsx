"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Customer, Status, api } from "@/lib/api";
import { STATUSES, STATUS_LABEL } from "@/lib/customers";
import { Modal } from "./modal";

/**
 * One dialog for both creating and editing. Passing `customer` switches it to
 * edit mode: the API takes a partial body, so an edit sends only the fields
 * that actually changed rather than rewriting the whole record.
 */
export function CustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = customer != null;

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    company: customer?.company ?? "",
    email: customer?.email ?? "",
    status: customer?.status ?? ("LEAD" as Status),
    value: customer ? String(customer.value) : "",
  });

  const save = useMutation({
    mutationFn: () => {
      if (!customer) {
        return api<Customer>("/customers", {
          method: "POST",
          body: JSON.stringify({ ...form, value: Number(form.value) }),
        });
      }

      const changed = changedFields(form, customer);

      // The API rejects an empty patch, and there is nothing to send anyway.
      if (Object.keys(changed).length === 0) return Promise.resolve(customer);

      return api<Customer>(`/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify(changed),
      });
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Modal
      as="form"
      labelledBy="customer-dialog-title"
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="modal-head">
        <div>
          <p className="eyebrow">{editing ? "编辑客户" : "新客户"}</p>
          <h2 id="customer-dialog-title">
            {editing ? customer.name : "添加客户"}
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X />
        </button>
      </div>

      <div className="form-grid">
        <label>
          姓名
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="陈晨"
          />
        </label>
        <label>
          公司
          <input
            required
            value={form.company}
            onChange={(event) =>
              setForm({ ...form, company: event.target.value })
            }
            placeholder="示例科技有限公司"
          />
        </label>
        <label className="wide">
          邮箱地址
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="jamie@acme.com"
          />
        </label>
        <label>
          客户状态
          <select
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as Status })
            }
          >
            {STATUSES.map((entry) => (
              <option key={entry} value={entry}>
                {STATUS_LABEL[entry]}
              </option>
            ))}
          </select>
        </label>
        <label>
          合同金额
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            placeholder="12000"
          />
        </label>
      </div>

      {save.isError && (
        <p className="form-error">
          {save.error instanceof Error
            ? save.error.message
            : "无法保存该客户。"}
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onClose}>
          取消
        </button>
        <button className="primary" disabled={save.isPending}>
          {save.isPending
            ? "保存中…"
            : editing
              ? "保存修改"
              : "添加客户"}
        </button>
      </div>
    </Modal>
  );
}

type FormState = {
  name: string;
  company: string;
  email: string;
  status: Status;
  value: string;
};

/**
 * The difference between what is on screen and what is stored.
 *
 * Sending the whole record on every save would overwrite any field that changed
 * elsewhere while this dialog sat open — a second tab, another device. `value`
 * is compared numerically because the input holds a string, and "18400" and
 * 18400 are the same contract.
 */
export function changedFields(
  form: FormState,
  customer: Customer,
): Partial<Record<keyof FormState, string | number>> {
  const changed: Partial<Record<keyof FormState, string | number>> = {};

  if (form.name !== customer.name) changed.name = form.name;
  if (form.company !== customer.company) changed.company = form.company;
  if (form.email !== customer.email) changed.email = form.email;
  if (form.status !== customer.status) changed.status = form.status;
  if (Number(form.value) !== customer.value) changed.value = Number(form.value);

  return changed;
}
