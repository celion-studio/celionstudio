"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import ImageExtension from "@tiptap/extension-image";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import { Node, ResizableNodeView, type Editor, type NodeViewRendererProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import type { TiptapDocJson } from "@/lib/tiptap-document";
import { CelionPaginationExtension, type CelionPaginationOptions } from "@/components/editor/CelionPaginationExtension";
import {
  paginationKey,
  requestPaginationRefresh,
} from "@/components/editor/pagination/pagination-plugin";
import {
  IMAGE_STORAGE_MAX_UPLOAD_BYTES,
  validateImageBlobMetadata,
} from "@/lib/image-storage";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Columns2,
  Crop,
  Heading2,
  Highlighter,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
type TiptapPageEditorProps = {
  doc: TiptapDocJson;
  toolbarHostId?: string;
  showToolbar?: boolean;
  placeholder?: string;
  pagination?: CelionPaginationOptions;
  onFocus?: () => void;
  onChange(doc: TiptapDocJson): void;
  onImageUploadStateChange?(uploading: boolean): void;
};

const DISABLED_PAGINATION_OPTIONS: CelionPaginationOptions = {
  enabled: false,
  pageWidthPx: 720,
  pageHeightPx: 1080,
  pageGapPx: 36,
  paddingTopPx: 48,
  paddingRightPx: 58,
  paddingBottomPx: 58,
  paddingLeftPx: 58,
  headerHeightPx: 42,
  footerHeightPx: 42,
  headerType: "none",
  headerText: "",
  headerAlign: "center",
  footerType: "page",
  footerText: "{page}",
  footerAlign: "center",
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

type MenuTextButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

type ImageAttrs = {
  src?: string | null;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  fit?: string | null;
  align?: string | null;
};

type MediaTextAttrs = ImageAttrs & {
  imageWidth?: number | null;
  imageSide?: string | null;
};

function setImageAttribute(element: HTMLImageElement, name: string, value: unknown) {
  if (typeof value === "string" && value.length > 0) element.setAttribute(name, value);
  else element.removeAttribute(name);
}

function clampImageWidthPercent(value: unknown) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 44;
  return Math.min(Math.max(numeric, 24), 68);
}

function clampImagePixelWidth(value: number, element: HTMLElement) {
  const editorContent = element.closest<HTMLElement>(".celion-tiptap-content");
  const maxWidth = Math.max((editorContent?.clientWidth ?? 720) - 2, 120);
  return Math.round(Math.min(Math.max(value, 80), maxWidth));
}

function applyImageAttributes(element: HTMLImageElement, attrs: ImageAttrs, className: string | undefined) {
  const fit = attrs.fit === "crop" ? "crop" : "contain";
  const align = ["left", "center", "right", "full"].includes(String(attrs.align)) ? String(attrs.align) : "center";
  const width = typeof attrs.width === "number" && Number.isFinite(attrs.width) ? attrs.width : null;
  const height = typeof attrs.height === "number" && Number.isFinite(attrs.height) ? attrs.height : null;

  setImageAttribute(element, "src", attrs.src);
  setImageAttribute(element, "alt", attrs.alt);
  setImageAttribute(element, "title", attrs.title);
  setImageAttribute(element, "class", className);
  element.setAttribute("data-fit", fit);
  element.setAttribute("data-align", align);

  if (align === "full") element.style.width = "100%";
  else if (width) element.style.width = `${width}px`;
  else element.style.removeProperty("width");

  if (height) element.style.height = `${height}px`;
  else element.style.removeProperty("height");

  element.style.objectFit = height ? (fit === "crop" ? "cover" : "contain") : "";
}

function applyMediaTextAttributes(dom: HTMLElement, image: HTMLImageElement, attrs: MediaTextAttrs, className: string | undefined) {
  const imageSide = attrs.imageSide === "right" ? "right" : "left";
  const imageWidth = clampImageWidthPercent(attrs.imageWidth);

  dom.setAttribute("data-image-side", imageSide);
  dom.style.setProperty("--media-image-width", `${imageWidth}%`);
  applyImageAttributes(image, { ...attrs, align: "full" }, className);
}

export const CelionImageExtension = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fit: {
        default: "contain",
        parseHTML: (element) => element.getAttribute("data-fit") ?? "contain",
        renderHTML: (attributes) => ({
          "data-fit": attributes.fit ?? "contain",
        }),
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align ?? "center",
        }),
      },
    };
  },

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") return null;

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;
    const className = typeof this.options.HTMLAttributes.class === "string" ? this.options.HTMLAttributes.class : undefined;

    return ({ node, getPos, editor }: NodeViewRendererProps) => {
      let currentNode = node;
      const element = document.createElement("img");
      applyImageAttributes(element, node.attrs as ImageAttrs, className);

      const nodeView = new ResizableNodeView({
        element,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          const nextWidth = clampImagePixelWidth(width, element);
          const nextHeight = width > 0 ? Math.round((height * nextWidth) / width) : height;
          element.style.width = `${nextWidth}px`;
          element.style.height = `${nextHeight}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          const attrs = currentNode.attrs as ImageAttrs;
          const isCrop = attrs.fit === "crop";
          const nextWidth = clampImagePixelWidth(width, element);
          const nextHeight = width > 0 ? Math.round((height * nextWidth) / width) : height;

          this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, {
            width: attrs.align === "full" ? null : nextWidth,
            height: isCrop ? nextHeight : null,
            align: attrs.align ?? "center",
            fit: attrs.fit ?? "contain",
          }).run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          currentNode = updatedNode;
          applyImageAttributes(element, updatedNode.attrs as ImageAttrs, className);
          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      return nodeView;
    };
  },
});

export const MediaTextExtension = Node.create({
  name: "mediaText",
  group: "block",
  content: "block+",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      fit: { default: "contain" },
      imageWidth: { default: 44 },
      imageSide: { default: "left" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='media-text']" }];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as MediaTextAttrs;
    const imageSide = attrs.imageSide === "right" ? "right" : "left";
    const imageWidth = clampImageWidthPercent(attrs.imageWidth);
    const fit = attrs.fit === "crop" ? "crop" : "contain";

    return [
      "div",
      {
        "data-type": "media-text",
        "data-image-side": imageSide,
        style: `--media-image-width:${imageWidth}%`,
      },
      [
        "figure",
        { "data-media-figure": "" },
        [
          "img",
          {
            src: attrs.src ?? "",
            alt: attrs.alt ?? "",
            title: attrs.title ?? undefined,
            "data-fit": fit,
          },
        ],
      ],
      ["div", { "data-media-text-content": "" }, 0],
    ];
  },

  addNodeView() {
    const className = "celion-tiptap-image";

    return ({ node, getPos, editor }: NodeViewRendererProps) => {
      let currentAttrs = node.attrs as MediaTextAttrs;
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "media-text");
      dom.className = "celion-media-text";

      const figure = document.createElement("figure");
      figure.setAttribute("data-media-figure", "");
      const image = document.createElement("img");
      figure.appendChild(image);

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "celion-media-text-resize-handle";
      resizeHandle.contentEditable = "false";
      resizeHandle.setAttribute("data-media-resize-handle", "");

      const contentDOM = document.createElement("div");
      contentDOM.setAttribute("data-media-text-content", "");
      contentDOM.className = "celion-media-text-copy";

      dom.append(figure, resizeHandle, contentDOM);
      applyMediaTextAttributes(dom, image, currentAttrs, className);

      resizeHandle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const containerRect = dom.getBoundingClientRect();
        const imageSide = dom.getAttribute("data-image-side") === "right" ? "right" : "left";

        const onMove = (moveEvent: PointerEvent) => {
          const relativeX = moveEvent.clientX - containerRect.left;
          const rawPercent = imageSide === "right"
            ? ((containerRect.width - relativeX) / containerRect.width) * 100
            : (relativeX / containerRect.width) * 100;
          const pos = getPos();
          if (pos === undefined) return;
          currentAttrs = { ...currentAttrs, imageWidth: clampImageWidthPercent(rawPercent) };
          editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, currentAttrs));
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });

      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          currentAttrs = updatedNode.attrs as MediaTextAttrs;
          applyMediaTextAttributes(dom, image, currentAttrs, className);
          return true;
        },
        selectNode: () => dom.classList.add("ProseMirror-selectednode"),
        deselectNode: () => dom.classList.remove("ProseMirror-selectednode"),
      };
    };
  },
});

function uploadErrorMessage(payload: { message?: string; note?: string } | null) {
  const message = payload?.message ?? "Could not upload this image.";
  return payload?.note ? `${message} ${payload.note}` : message;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function hasVisibleContent(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;

  const contentNode = node as { type?: unknown; text?: unknown; content?: unknown };
  if (typeof contentNode.text === "string" && contentNode.text.trim().length > 0) return true;

  if (
    typeof contentNode.type === "string" &&
    !["doc", "paragraph", "heading", "listItem", "bulletList", "orderedList", "taskList", "taskItem", "blockquote"].includes(contentNode.type)
  ) {
    return true;
  }

  return Array.isArray(contentNode.content) && contentNode.content.some(hasVisibleContent);
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled) onClick();
      }}
      style={{
        width: "30px",
        height: "30px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid transparent",
        borderRadius: "6px",
        background: active ? "#F0ECFF" : "transparent",
        color: disabled ? "#c8c2ba" : active ? "#5B3EEB" : "#34302b",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function MenuTextButton({ label, active = false, onClick }: MenuTextButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      style={{
        minWidth: "28px",
        height: "28px",
        padding: "0 8px",
        border: "1px solid transparent",
        borderRadius: "6px",
        background: active ? "#F0ECFF" : "transparent",
        color: active ? "#5B3EEB" : "#34302b",
        cursor: "pointer",
        fontFamily: "'Geist', sans-serif",
        fontSize: "11px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function MenuIconButton({ label, active = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      style={{
        width: "28px",
        height: "28px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid transparent",
        borderRadius: "5px",
        background: active ? "#ebe7ff" : "transparent",
        color: active ? "#4f38d8" : "#342f2a",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ width: "1px", height: "20px", background: "#E8E2DA", margin: "0 3px" }} />;
}

export function TiptapToolbar({
  editor,
  imageUploading,
  onPickImage,
}: {
  editor: Editor | null;
  imageUploading: boolean;
  onPickImage: () => void;
}) {
  if (!editor) return null;

  return (
    <div
      className="celion-tiptap-toolbar"
      style={{
        height: "42px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        width: "100%",
        minWidth: 0,
        padding: "5px 14px",
        background: "transparent",
        boxSizing: "border-box",
        overflowX: "auto",
      }}
    >
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={15} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={15} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline size={15} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={15} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fff1a8" }).run()}>
        <Highlighter size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={16} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <CheckSquare size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={16} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label={imageUploading ? "Uploading image" : "Image"} disabled={imageUploading} onClick={onPickImage}>
        <ImageIcon size={16} strokeWidth={1.8} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <AlignJustify size={15} strokeWidth={1.8} />
      </ToolbarButton>
    </div>
  );
}

export function SelectionBubbleMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      pluginKey="celion-text-selection-menu"
      editor={editor}
      shouldShow={({ editor }) => {
        const { empty } = editor.state.selection;
        return !empty && editor.isEditable && !editor.isActive("image");
      }}
      appendTo={() => document.body}
      updateDelay={0}
      options={{ placement: "top", offset: 8, shift: { padding: 8 } }}
      className="celion-selection-menu"
    >
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline size={14} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={14} strokeWidth={2} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fff1a8" }).run()}>
        <Highlighter size={14} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={14} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={14} strokeWidth={1.8} />
      </ToolbarButton>
    </BubbleMenu>
  );
}

export function ImageBubbleMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const imageAttrs = editor.getAttributes("image") as {
    width?: number | null;
    height?: number | null;
    fit?: string | null;
    align?: string | null;
  };
  const currentWidth = Number(imageAttrs.width) || null;
  const isCrop = imageAttrs.fit === "crop";
  const currentAlign = imageAttrs.align ?? "center";

  const setWidth = (width: number | null) => {
    editor.chain().updateAttributes("image", {
      width,
      height: null,
      fit: "contain",
      align: width ? (currentAlign === "full" ? "center" : currentAlign) : "full",
    }).focus().run();
  };

  const setAlign = (align: "left" | "center" | "right" | "full") => {
    editor.chain().updateAttributes("image", {
      align,
      width: align === "full" ? null : currentWidth ?? 420,
      height: align === "full" ? null : imageAttrs.height ?? null,
      fit: align === "full" ? "contain" : imageAttrs.fit ?? "contain",
    }).focus().run();
  };

  const setCrop = () => {
    const width = currentWidth ?? 420;
    editor.chain().updateAttributes("image", {
      width,
      height: Math.round(width * 0.62),
      fit: "crop",
      align: currentAlign === "full" ? "center" : currentAlign,
    }).focus().run();
  };

  const convertToMediaText = () => {
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return;

    const attrs = selection.node.attrs as ImageAttrs;
    editor.chain().focus().insertContentAt(
      { from: selection.from, to: selection.to },
      {
        type: "mediaText",
        attrs: {
          src: attrs.src,
          alt: attrs.alt,
          title: attrs.title,
          fit: attrs.fit ?? "contain",
          imageWidth: 44,
          imageSide: "left",
        },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Write the supporting text here." }],
          },
        ],
      },
    ).run();
  };

  return (
    <BubbleMenu
      pluginKey="celion-image-menu"
      editor={editor}
      shouldShow={({ editor }) => editor.isEditable && editor.isActive("image")}
      appendTo={() => document.body}
      updateDelay={0}
      options={{ placement: "top", offset: 8, shift: { padding: 8 } }}
      className="celion-selection-menu celion-image-menu"
    >
      <div className="celion-menu-group">
        <MenuTextButton label="S" active={currentWidth === 240} onClick={() => setWidth(240)} />
        <MenuTextButton label="M" active={currentWidth === 420} onClick={() => setWidth(420)} />
        <MenuIconButton label="Full width" active={currentAlign === "full"} onClick={() => setAlign("full")}>
          <Maximize2 size={14} strokeWidth={1.8} />
        </MenuIconButton>
      </div>
      <Divider />
      <div className="celion-menu-group">
        <MenuIconButton label="Align left" active={currentAlign === "left"} onClick={() => setAlign("left")}>
          <AlignLeft size={14} strokeWidth={1.8} />
        </MenuIconButton>
        <MenuIconButton label="Align center" active={currentAlign === "center"} onClick={() => setAlign("center")}>
          <AlignCenter size={14} strokeWidth={1.8} />
        </MenuIconButton>
        <MenuIconButton label="Align right" active={currentAlign === "right"} onClick={() => setAlign("right")}>
          <AlignRight size={14} strokeWidth={1.8} />
        </MenuIconButton>
      </div>
      <Divider />
      <MenuIconButton label="Crop frame" active={isCrop} onClick={setCrop}>
        <Crop size={14} strokeWidth={1.8} />
      </MenuIconButton>
      <MenuIconButton label="Image and text" onClick={convertToMediaText}>
        <Columns2 size={14} strokeWidth={1.8} />
      </MenuIconButton>
      <MenuIconButton label="Delete image" onClick={() => editor.chain().deleteSelection().focus().run()}>
        <Trash2 size={14} strokeWidth={1.8} />
      </MenuIconButton>
    </BubbleMenu>
  );
}

export function TiptapPageEditor({
  doc,
  toolbarHostId,
  showToolbar = true,
  placeholder,
  pagination,
  onFocus,
  onChange,
  onImageUploadStateChange,
}: TiptapPageEditorProps) {
  const suppressChangeRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const uploadTokenRef = useRef(0);
  const mountedRef = useRef(false);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
  const [imageInsertError, setImageInsertError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [lastFailedImageFile, setLastFailedImageFile] = useState<File | null>(null);
  const appliedDocRef = useRef<TiptapDocJson>(doc);
  const onFocusRef = useRef(onFocus);
  const onChangeRef = useRef(onChange);
  const paginationRef = useRef<CelionPaginationOptions | undefined>(pagination);
  const getPaginationOptionsRef = useRef(
    () => paginationRef.current ?? DISABLED_PAGINATION_OPTIONS,
  );
  const showPlaceholder = Boolean(placeholder && !hasVisibleContent(doc));
  const paginationSignature = useMemo(() => {
    if (!pagination?.enabled) return "pagination:off";
    return [
      pagination.pageWidthPx,
      pagination.pageHeightPx,
      pagination.pageGapPx,
      pagination.paddingTopPx,
      pagination.paddingRightPx,
      pagination.paddingBottomPx,
      pagination.paddingLeftPx,
      pagination.headerHeightPx,
      pagination.footerHeightPx,
      pagination.headerType,
      pagination.headerText,
      pagination.headerAlign,
      pagination.footerType,
      pagination.footerText,
      pagination.footerAlign,
    ].join(":");
  }, [pagination]);
  onFocusRef.current = onFocus;
  onChangeRef.current = onChange;
  paginationRef.current = pagination;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      uploadTokenRef.current += 1;
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      onImageUploadStateChange?.(false);
    };
  }, [onImageUploadStateChange]);

  useEffect(() => {
    onImageUploadStateChange?.(imageUploading);
  }, [imageUploading, onImageUploadStateChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
        underline: false,
      }),
      Highlight.configure({ multicolor: true }),
      UnderlineExtension,
      CelionImageExtension.configure({
        allowBase64: false,
        resize: {
          enabled: true,
          directions: ["left", "right"],
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
        HTMLAttributes: {
          class: "celion-tiptap-image",
        },
      }),
      MediaTextExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CelionPaginationExtension.configure({
        ...DISABLED_PAGINATION_OPTIONS,
        getOptions: getPaginationOptionsRef.current,
      }),
    ],
    content: doc,
    editorProps: {
      attributes: {
        class: pagination?.enabled
          ? "celion-tiptap-content celion-with-pagination"
          : "celion-tiptap-content",
      },
      handleClickOn(view, _pos, node, nodePos) {
        if (node.type.name !== "image") return false;
        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
        return true;
      },
    },
    onFocus() {
      onFocusRef.current?.();
    },
    onUpdate({ editor }) {
      if (suppressChangeRef.current) return;
      const nextDoc = editor.getJSON() as TiptapDocJson;
      appliedDocRef.current = nextDoc;
      onChangeRef.current(nextDoc);
    },
  }, []);

  useEffect(() => {
    setToolbarHost(toolbarHostId ? document.getElementById(toolbarHostId) : null);
  }, [toolbarHostId]);

  useEffect(() => {
    if (!editor) return;

    const className = pagination?.enabled
      ? "celion-tiptap-content celion-with-pagination"
      : "celion-tiptap-content";

    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...editor.options.editorProps.attributes,
          class: className,
        },
      },
    });
  }, [editor, pagination?.enabled]);

  useEffect(() => {
    if (!editor) return;

    editor.view.dispatch(
      editor.view.state.tr
        .setMeta(paginationKey, requestPaginationRefresh())
        .setMeta("addToHistory", false),
    );
  }, [
    editor,
    pagination,
    paginationSignature,
  ]);

  useEffect(() => {
    if (!editor || appliedDocRef.current === doc) return;

    suppressChangeRef.current = true;
    editor.commands.setContent(doc, { emitUpdate: false });
    appliedDocRef.current = doc;

    const timeout = window.setTimeout(() => {
      suppressChangeRef.current = false;
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [doc, editor]);

  async function insertImageFile(file: File) {
    if (!editor || imageUploading || !file.type.startsWith("image/")) return;

    setLastFailedImageFile(null);
    const fileValidation = validateImageBlobMetadata(file, {
      maxBytes: IMAGE_STORAGE_MAX_UPLOAD_BYTES,
    });
    if (!fileValidation.ok) {
      setImageInsertError(fileValidation.error.message);
      return;
    }

    const insertionRange = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    const uploadToken = uploadTokenRef.current + 1;
    uploadTokenRef.current = uploadToken;
    uploadControllerRef.current?.abort();
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    let retryableFailure = true;

    setImageUploading(true);
    setImageInsertError("Uploading image...");

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            image?: {
              url?: string;
              name?: string;
            };
            message?: string;
            note?: string;
          }
        | null;

      const imageUrl = payload?.image?.url;
      if (!response.ok || !imageUrl) {
        retryableFailure = response.status === 429 || response.status >= 500;
        throw new Error(uploadErrorMessage(payload));
      }

      if (!mountedRef.current || uploadTokenRef.current !== uploadToken || editor.isDestroyed) return;

      setImageInsertError("");
      setLastFailedImageFile(null);
      editor.chain().focus().insertContentAt(insertionRange, {
        type: "image",
        attrs: {
          src: imageUrl,
          alt: payload.image?.name ?? file.name,
        },
      }).run();
    } catch (error) {
      if (isAbortError(error) || !mountedRef.current || uploadTokenRef.current !== uploadToken) return;
      setLastFailedImageFile(retryableFailure ? file : null);
      setImageInsertError(
        error instanceof Error ? error.message : "Could not upload this image.",
      );
    } finally {
      if (uploadTokenRef.current === uploadToken) {
        uploadControllerRef.current = null;
        if (mountedRef.current) setImageUploading(false);
      }
    }
  }

  return (
    <>
      {showToolbar && toolbarHost
        ? createPortal(
            <TiptapToolbar
              editor={editor}
              imageUploading={imageUploading}
              onPickImage={() => fileInputRef.current?.click()}
            />,
            toolbarHost,
          )
        : null}
      <div className="celion-tiptap-editor">
        {showPlaceholder ? (
          <div className="celion-tiptap-placeholder" aria-hidden="true">
            {placeholder}
          </div>
        ) : null}
        {imageInsertError ? (
          <div
            role="status"
            style={{
              margin: "0 0 12px",
              border: "1px solid #ead6d1",
              borderRadius: "4px",
              background: "#fff8f6",
              color: "#9a3b30",
              fontFamily: "'Geist', sans-serif",
              fontSize: "12px",
              lineHeight: 1.5,
              padding: "8px 10px",
            }}
          >
            <span>{imageInsertError}</span>
            {lastFailedImageFile && !imageUploading ? (
              <button
                type="button"
                onClick={() => void insertImageFile(lastFailedImageFile)}
                style={{
                  marginLeft: "8px",
                  border: "1px solid rgba(154,59,48,0.25)",
                  borderRadius: "4px",
                  background: "#fff",
                  color: "#7a2f27",
                  cursor: "pointer",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "11px",
                  fontWeight: 650,
                  padding: "3px 7px",
                }}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void insertImageFile(file);
            event.currentTarget.value = "";
          }}
        />
        <SelectionBubbleMenu editor={editor} />
        <ImageBubbleMenu editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
