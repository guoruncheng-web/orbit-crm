import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

function open(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <>
        <button>behind the modal</button>
        <Modal labelledBy="t" onClose={onClose}>
          <h2 id="t">A dialog</h2>
          <button>first</button>
          <button>last</button>
        </Modal>
      </>,
    ),
  };
}

describe("Modal", () => {
  it("moves focus to the first control so a keyboard user can start typing", () => {
    open();
    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
  });

  it("keeps Tab inside the dialog instead of walking onto the page behind", async () => {
    const user = userEvent.setup();
    open();

    await user.tab();
    expect(screen.getByRole("button", { name: "last" })).toHaveFocus();

    // Wrapping is the whole point: without it the next stop is the page behind.
    await user.tab();
    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
  });

  it("wraps backwards too", async () => {
    const user = userEvent.setup();
    open();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = open();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the backdrop is pressed but not the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = render(
      <Modal labelledBy="t" onClose={onClose}>
        <h2 id="t">A dialog</h2>
      </Modal>,
    );

    await user.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(container.querySelector(".modal-backdrop")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("returns focus to whatever opened it", async () => {
    const user = userEvent.setup();
    const opener = document.createElement("button");
    opener.textContent = "open";
    document.body.append(opener);
    opener.focus();

    const { unmount } = render(
      <Modal labelledBy="t" onClose={vi.fn()}>
        <h2 id="t">A dialog</h2>
        <button>inside</button>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "inside" })).toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("locks the page behind it from scrolling, and gives it back", () => {
    const { unmount } = render(
      <Modal labelledBy="t" onClose={vi.fn()}>
        <h2 id="t">A dialog</h2>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("announces itself as an alertdialog when asked", () => {
    render(
      <Modal role="alertdialog" labelledBy="t" onClose={vi.fn()}>
        <h2 id="t">Delete this?</h2>
      </Modal>,
    );

    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Delete this?");
  });
});
