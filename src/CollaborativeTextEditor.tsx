import "quill/dist/quill.snow.css";
import Quill, { Delta, EmitterSource, Range } from "quill";
import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "react-router";

const SAVE_TIMEOUT_MS = 500;

const CURSOR_COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFA500",
  "#800080",
  "#008080",
  "#FFD700",
  "#FF69B4",
];

interface CursorPosition {
  range: Range;
  color: string;
  userId: string;
}

const toolbarOptions = [
  ["bold", "italic", "underline"],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

function CollaborativeTextEditor() {
  const [socket, setSocket] = useState<Socket>();
  const [quill, setQuill] = useState<Quill>();
  const [cursors, setCursors] = useState<Map<string, HTMLDivElement>>(
    new Map()
  );
  const [cursorColor, setCursorColor] = useState<string>("");

  const params = useParams();

  const createCursor = (color: string) => {
    const cursor = document.createElement("div");
    cursor.classList.add("ql-cursor");
    cursor.innerHTML = `
      <div class="cursor-caret" style="background-color:${color}"></div>
    `;
    return cursor;
  };

  const updateCursor = (
    cursor: HTMLDivElement,
    range: Range,
    quillEditor: Quill
  ) => {
    const bounds = quillEditor.getBounds(range.index);
    cursor.style.left = `${bounds?.left}px`;
    cursor.style.top = `${bounds?.top}px`;
    cursor.style.height = `${bounds?.height}px`;
    cursor.style.display = "block";
  };

  const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";

    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: toolbarOptions },
    });
    setQuill(q);
    q.disable();
    q.setText("Loading...");

    const style = document.createElement("style");
    style.textContent = `
    .ql-cursor {
      position: absolute;
      pointer-events: none; 
      z-index: 100;
    }
    .cursor-caret {
      position: absolute;
      top: -4px;
      width: 2px;
      height: 25px;
      animation: blink 1s infinite;

    }

    @keyframes blink {
        0% {
            opacity: 1;
        }

        50% {
            opacity: 0;
        }

        100% {
            opacity: 1;
        }
    }
  `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const IO = io("http://localhost:8001");
    setSocket(IO);

    const randomColor =
      CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
    setCursorColor(randomColor);

    return () => {
      IO.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !quill) return;

    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("get-document", params.id);
  }, [params.id, socket, quill]);

  useEffect(() => {
    if (!socket || !quill) return;

    const selectionChangeHandler = (range: Range | null) => {
      if (range) {
        socket.emit("cursor-update", {
          range,
          color: cursorColor,
          userId: socket.id,
        });
      }
    };

    quill.on("selection-change", selectionChangeHandler);

    return () => {
      quill.off("selection-change", selectionChangeHandler);
    };
  }, [quill, socket, cursorColor]);

  useEffect(() => {
    if (!socket || !quill) return;

    const textChangeHandler = (
      data: Delta,
      oldDelta: Delta,
      source: EmitterSource
    ) => {
      if (source !== "user") return;

      const range = quill.getSelection();

      socket.emit("cursor-update", {
        range,
        color: cursorColor,
        userId: socket.id,
      });
    };

    quill?.on("text-change", textChangeHandler);

    return () => {
      quill?.off("text-change", textChangeHandler);
    };
  }, [quill, socket]);

  useEffect(() => {
    if (!socket || !quill) return;

    const cursorUpdateHandler = ({ range, color, userId }: CursorPosition) => {
      if (userId === socket.id) return;

      let cursor = cursors.get(userId);

      if (!cursor) {
        cursor = createCursor(color);

        quill.container.appendChild(cursor);
        setCursors(new Map(cursors.set(userId, cursor)));
      }

      updateCursor(cursor, range, quill);
    };

    socket.on("cursor-update", cursorUpdateHandler);

    return () => {
      socket.off("cursor-update", cursorUpdateHandler);
    };
  }, [quill, socket, cursors]);

  useEffect(() => {
    if (!socket || !quill) return;

    const disconnectHandler = (userId: string) => {
      const cursor = cursors.get(userId);
      if (cursor) {
        cursor.remove();
        cursors.delete(userId);
        setCursors(new Map(cursors));
      }
    };

    socket.on("user-disconnected", disconnectHandler);

    return () => {
      socket.off("user-disconnected", disconnectHandler);
    };
  }, [quill, socket, cursors]);

  useEffect(() => {
    if (!socket || !quill) return;

    let timeoutId: number;

    const textChangeHandler = (
      delta: Delta,
      oldDelta: Delta,
      source: EmitterSource
    ) => {
      if (source !== "user") return;

      socket?.emit("send-changes", delta);

      timeoutId = setTimeout(() => {
        const updatedDoc = {
          id: params.id,
          data: quill.getContents(),
        };
        socket.emit("save-document", updatedDoc);
      }, SAVE_TIMEOUT_MS);
    };

    quill?.on("text-change", textChangeHandler);

    return () => {
      clearInterval(timeoutId);
      quill?.off("text-change", textChangeHandler);
    };
  }, [quill, socket]);

  useEffect(() => {
    if (!socket || !quill) return;

    const textReceiveHandler = (data: any) => {
      quill?.updateContents(data);
    };
    socket?.on("receive-changes", textReceiveHandler);

    return () => {
      socket?.off("receive-changes", textReceiveHandler);
    };
  }, [quill, socket]);

  return (
    <div
      className="editor"
      ref={wrapperRef}
    ></div>
  );
}

export default CollaborativeTextEditor;
