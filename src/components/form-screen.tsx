import type { ReactNode } from "react";

/**
 * Screen scaffold for request forms: the header and the action footer stay
 * pinned while only the middle content scrolls. On short forms it looks
 * identical to a static page; on long forms the button never leaves the
 * bottom of the screen and the header never leaves the top.
 */
export function FormScreen({
  head,
  footer,
  children,
}: {
  head: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="screen bg-bg">
      <div className="px-6 pt-safe-58 shrink-0">{head}</div>
      <div className="screen-scroll px-6">{children}</div>
      <div className="screen-dock shrink-0 px-6">{footer}</div>
    </div>
  );
}
