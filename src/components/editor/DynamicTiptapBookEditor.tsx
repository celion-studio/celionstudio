"use client";

import dynamic from "next/dynamic";

export const DynamicTiptapBookEditor = dynamic(
  () => import("./TiptapBookEditor").then((module) => module.TiptapBookEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100%",
          background: "#f6f7f8",
          color: "#858b93",
          fontSize: "13px",
          fontFamily: "'Geist', sans-serif",
        }}
      >
        Loading editor...
      </div>
    ),
  },
);
