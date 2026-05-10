import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageNode } from "@/components/shared/resizable-image-node";

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attrs) => (attrs.width ? { width: String(attrs.width) } : {}),
      },
      fileId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-file-id") ?? null,
        renderHTML: (attrs) => (attrs.fileId ? { "data-file-id": attrs.fileId } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNode);
  },
});
