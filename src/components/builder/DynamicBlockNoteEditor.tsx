"use client";

import dynamic from "next/dynamic";

export const DynamicBlockNoteEditor = dynamic(
  () => import("./BlockNoteEditor").then((module) => module.BlockNoteEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100%",
          background: "#f2ede4",
          color: "#8a867e",
          fontSize: "13px",
          fontFamily: "'Geist', sans-serif",
        }}
      >
        Loading editor...
      </div>
    ),
  },
);
