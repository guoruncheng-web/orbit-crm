import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Customer } from "@/lib/api";
import { CustomerDialog, changedFields } from "./customer-dialog";

const CUSTOMER: Customer = {
  id: "c1",
  name: "Olivia Martin",
  company: "Northstar Labs",
  email: "olivia@northstar.example",
  status: "ACTIVE",
  value: 18400,
  lastContact: "2026-08-12",
  createdAt: "2026-08-12T09:30:00.000Z",
};

function renderDialog(props: Partial<React.ComponentProps<typeof CustomerDialog>> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <CustomerDialog onClose={vi.fn()} onSaved={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

function stubFetch(body: unknown = CUSTOMER) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The request body of the nth fetch call, parsed. */
function sentBody(fetchMock: ReturnType<typeof stubFetch>, call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string);
}

describe("changedFields", () => {
  it("is empty when nothing was touched", () => {
    expect(
      changedFields(
        {
          name: CUSTOMER.name,
          company: CUSTOMER.company,
          email: CUSTOMER.email,
          status: CUSTOMER.status,
          value: String(CUSTOMER.value),
        },
        CUSTOMER,
      ),
    ).toEqual({});
  });

  it("compares value numerically, so a string form field is not a false change", () => {
    expect(
      changedFields(
        {
          name: CUSTOMER.name,
          company: CUSTOMER.company,
          email: CUSTOMER.email,
          status: CUSTOMER.status,
          value: "18400.00",
        },
        CUSTOMER,
      ),
    ).toEqual({});
  });

  it("reports only the fields that differ", () => {
    expect(
      changedFields(
        {
          name: CUSTOMER.name,
          company: "Northstar Laboratories",
          email: CUSTOMER.email,
          status: "AT_RISK",
          value: String(CUSTOMER.value),
        },
        CUSTOMER,
      ),
    ).toEqual({ company: "Northstar Laboratories", status: "AT_RISK" });
  });
});

describe("CustomerDialog", () => {
  it("creates with a POST carrying the whole record", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    renderDialog();

    await user.type(screen.getByLabelText(/full name/i), "Jamie Chen");
    await user.type(screen.getByLabelText(/company/i), "Acme Inc.");
    await user.type(screen.getByLabelText(/email/i), "jamie@acme.com");
    await user.type(screen.getByLabelText(/contract value/i), "12000");
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(sentBody(fetchMock)).toEqual({
      name: "Jamie Chen",
      company: "Acme Inc.",
      email: "jamie@acme.com",
      status: "LEAD",
      // The form holds a string; the API wants a number.
      value: 12000,
    });
  });

  it("prefills from the customer being edited", () => {
    renderDialog({ customer: CUSTOMER });

    expect(screen.getByLabelText(/full name/i)).toHaveValue("Olivia Martin");
    expect(screen.getByLabelText(/contract value/i)).toHaveValue(18400);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("patches only what changed, so a concurrent edit elsewhere survives", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    renderDialog({ customer: CUSTOMER });

    const company = screen.getByLabelText(/company/i);
    await user.clear(company);
    await user.type(company, "Northstar Laboratories");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock.mock.calls[0][0]).toContain("/customers/c1");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(sentBody(fetchMock)).toEqual({ company: "Northstar Laboratories" });
  });

  it("does not call the API at all when nothing changed", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    const onClose = vi.fn();
    renderDialog({ customer: CUSTOMER, onClose });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API's message instead of a generic failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ["email must be an email"] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    renderDialog({ customer: CUSTOMER });

    const company = screen.getByLabelText(/company/i);
    await user.clear(company);
    await user.type(company, "Anything");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("email must be an email")).toBeInTheDocument();
  });

  it("keeps the dialog open when the save fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "nope" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const onClose = vi.fn();
    renderDialog({ customer: CUSTOMER, onClose });

    const company = screen.getByLabelText(/company/i);
    await user.clear(company);
    await user.type(company, "Anything");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await screen.findByText("nope");
    expect(onClose).not.toHaveBeenCalled();
  });
});
