"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

type ImageAttrs = {
  src: string;
  alt?: string | null;
  width?: number | null;
  fileId?: string | null;
};

export function ResizableImageNode({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as ImageAttrs;
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const imageRef = useRef<HTMLImageElement>(null);

  // updateAttributes はレンダーごとに新しい参照になるため ref で最新を保持
  const updateAttributesRef = useRef(updateAttributes);
  useEffect(() => {
    updateAttributesRef.current = updateAttributes;
  });

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: MouseEvent) => {
      const newWidth = Math.max(50, Math.round(startWidth.current + e.clientX - startX.current));
      updateAttributesRef.current({ width: newWidth });
    };
    const onUp = () => setIsResizing(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  return (
    <NodeViewWrapper
      as="span"
      className="inline-block relative my-2"
      style={{ maxWidth: "100%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={attrs.src}
        alt={attrs.alt ?? ""}
        style={{
          width: attrs.width ? `${attrs.width}px` : "auto",
          maxWidth: "100%",
          display: "block",
          margin: 0,
          borderRadius: "0.375rem",
          cursor: isResizing ? "se-resize" : "default",
        }}
        draggable={false}
      />
      {editor.isEditable && selected && (
        <span
          className="absolute bottom-0 right-0 block cursor-se-resize"
          style={{
            width: 14,
            height: 14,
            background: "oklch(0.511 0.262 276.966)",
            borderRadius: "3px 0 0 0",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            startX.current = e.clientX;
            startWidth.current = imageRef.current?.offsetWidth ?? attrs.width ?? 400;
            setIsResizing(true);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
