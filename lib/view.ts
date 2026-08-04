/** Which pane the middle column is showing. Client-side only — no page reloads. */
export type View =
  | { kind: "home" }
  | { kind: "contact" }
  | { kind: "project"; projectId: string };
