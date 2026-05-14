import { FiFileText } from "react-icons/fi";

type CelionDocumentPreviewProps = {
  className?: string;
  density?: "compact" | "regular";
  showLeadingIcon?: boolean;
};

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CelionDocumentPreview({
  className,
  density = "regular",
  showLeadingIcon = true,
}: CelionDocumentPreviewProps) {
  return (
    <div
      className={joinClassNames("celion-document-preview", className)}
      data-density={density}
      data-leading-icon={showLeadingIcon ? "true" : "false"}
      aria-hidden="true"
    >
      {showLeadingIcon ? (
        <div className="celion-document-preview-icon">
          <FiFileText size={17} strokeWidth={1.7} />
        </div>
      ) : null}
      <div className="celion-document-preview-page">
        {!showLeadingIcon ? (
          <FiFileText
            className="celion-document-preview-page-glyph"
            size={15}
            strokeWidth={1.7}
          />
        ) : null}
        <span className="celion-document-preview-line" data-width="long" />
        <span className="celion-document-preview-line" data-width="medium" />
        <span className="celion-document-preview-line" data-width="short" />
        <span className="celion-document-preview-block" />
      </div>
    </div>
  );
}
