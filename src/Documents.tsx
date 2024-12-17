import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

interface Document {
  _id: string;
  name: string;
  data: Object;
}

function Documents() {
  const [documentName, setDocumentName] = useState<string>();
  const [documents, setDocuments] = useState<Document[]>();
  const navigate = useNavigate();

  useEffect(() => {
    async function getDocuments() {
      try {
        const response = await fetch("http://localhost:8000");
        const data = await response.json();
        setDocuments(data.documents);
      } catch (err) {
        console.log((err as Error).message);
      }
    }

    getDocuments();
  }, []);

  const createDocument = async () => {
    if (!!!documentName) return;

    try {
      const response = await fetch("http://localhost:8000", {
        method: "POST",
        body: JSON.stringify({
          name: documentName,
        }),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await response.json();
      navigate(`/document/${data.document._id}`);
    } catch (err) {
      console.log((err as Error).message);
    }
  };

  return (
    <div className="container">
      <div className="container__form">
        <input
          type="text"
          name="document"
          placeholder="Enter document name..."
          className="container__form-input"
          onChange={(e) => setDocumentName(e.target.value)}
        />
        <button
          className="container__form-btn"
          onClick={createDocument}
        >
          Create Document
        </button>
      </div>
      <div className="container__grid">
        {documents?.map((doc) => (
          <Document
            key={doc._id}
            name={doc.name}
            id={doc._id}
          />
        ))}
      </div>
    </div>
  );
}

export default Documents;

interface DocumentProps {
  name: string;
  id: string;
}

function Document({ name, id }: DocumentProps) {
  return (
    <Link to={`/document/${id}`}>
      <div className="document__card">
        <h4>{name}</h4>
      </div>
    </Link>
  );
}
