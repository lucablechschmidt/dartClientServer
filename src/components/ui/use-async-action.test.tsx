import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { InviteSection } from "@/components/screens/account/invite-section";
import { useAsyncAction } from "./use-async-action";

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

type R = { ok: true } | { ok: false; reason: "forbidden" };

describe("useAsyncAction (R-16)", () => {
  it("pending while the call runs, a second run meanwhile is ignored, the result goes to onResult", async () => {
    const answer = deferred<R>();
    const action = vi.fn<(id: string) => Promise<R>>(() => answer.promise);
    const onResult = vi.fn();
    const { result } = renderHook(() => useAsyncAction(action, onResult));
    expect(result.current.pending).toBe(false);
    act(() => {
      result.current.run("a");
      result.current.run("a");
    });
    expect(action).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(true);
    expect(result.current.rowButton("a")).toEqual({ pending: true, disabled: true });
    expect(result.current.rowButton("b")).toEqual({ pending: false, disabled: true });
    await act(() => {
      answer.resolve({ ok: true });
      return answer.promise;
    });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(onResult).toHaveBeenCalledWith({ ok: true }, "a");
    expect(result.current.error).toBeNull();
  });

  it("keeps the reason of a failed result until the next call succeeds", async () => {
    const replies: R[] = [{ ok: false, reason: "forbidden" }, { ok: true }];
    const { result } = renderHook(() => useAsyncAction(() => Promise.resolve(replies.shift() ?? { ok: true })));
    act(() => result.current.run());
    await waitFor(() => expect(result.current.error).toBe("forbidden"));
    act(() => result.current.run());
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it("a double tap on 'create invite' creates one invite; the button is busy meanwhile", async () => {
    const user = userEvent.setup();
    const answer = deferred<{ url: string; svg: string }>();
    const onCreateInvite = vi.fn(() => answer.promise);
    render(<InviteSection texts={de.account} onCreateInvite={onCreateInvite} />);
    const button = screen.getByRole("button", { name: de.account.admin.createInvite });
    await user.dblClick(button);
    expect(onCreateInvite).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await act(() => {
      answer.resolve({ url: "https://x/einladung/abc", svg: "<svg/>" });
      return answer.promise;
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).not.toHaveAttribute("aria-busy");
  });
});
