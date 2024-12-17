import "quill/dist/quill.snow.css";
import Quill, { Delta, EmitterSource } from "quill";
import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "react-router";

const SAVE_TIMEOUT_MS = 500;

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

  const params = useParams();

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
  }, []);

  useEffect(() => {
    const IO = io("http://localhost:8001");
    setSocket(IO);

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
