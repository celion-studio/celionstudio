"use client";

import { useEffect, useRef } from "react";
import { CelionButton } from "@/components/ui/celion-controls";
import { useCreateProjectNavigation } from "@/components/dashboard/use-create-project-navigation";

export function NewProjectLauncher() {
  const startedRef = useRef(false);
  const { createAndOpenProject, createProjectError } = useCreateProjectNavigation("replace");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void createAndOpenProject();
  }, [createAndOpenProject]);

  return (
    <section
      style={{
        minHeight: "360px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Geist', sans-serif",
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: 0,
            color: "#17191d",
          }}
        >
          Creating project
        </h1>
        <p
          style={{
            margin: "10px auto 0",
            maxWidth: "320px",
            fontFamily: "'Geist', sans-serif",
            fontSize: "13px",
            lineHeight: 1.5,
            color: "#858b93",
          }}
        >
          {createProjectError || "Opening the editor setup screen."}
        </p>
        {createProjectError ? (
          <CelionButton
            onClick={() => {
              void createAndOpenProject();
            }}
            variant="primary"
            style={{ marginTop: "18px", minHeight: "36px", padding: "0 16px" }}
          >
            Try again
          </CelionButton>
        ) : null}
      </div>
    </section>
  );
}
