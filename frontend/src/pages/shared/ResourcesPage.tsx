import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { generateNotes } from "../../services/geminiService";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { Button, Card, Spinner } from "../../components/ui";
import { BASE } from "../../services/api";
import { DocumentTextIcon, SparklesIcon } from "../../components/Icons";

const ResourcesPage = () => {
  const { resources } = useAppContext();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateNotes = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setIsLoading(true);
    setError("");
    setNotes("");
    try {
      const generatedNotes = await generateNotes(topic);
      setNotes(generatedNotes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Learning Resources</h2>
      <Card>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-primary-400" />
          AI-Powered Notes Generator
        </h3>
        <p className="mb-4 text-slate-300">
          Enter a topic, and the AI will generate study notes for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 'React Hooks' or 'The Krebs Cycle'"
            className="grow p-2 border rounded-md bg-slate-700 border-slate-600 focus:ring-primary-500 focus:border-primary-500"
          />
          <Button onClick={handleGenerateNotes} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner /> Generating...
              </>
            ) : (
              <>
                <DocumentTextIcon className="w-5 h-5" /> Generate Notes
              </>
            )}
          </Button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </Card>

      {notes && (
        <Card>
          <h3 className="text-2xl font-bold mb-4">Notes on: {topic}</h3>
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: notes }}
          />
        </Card>
      )}

      <Card>
        <h3 className="text-xl font-semibold mb-4">Uploaded Content</h3>
        <ul className="space-y-2">
          {resources.map((res: any) => {
            const isFile =
              res.type === "file" &&
              typeof res.content === "string" &&
              res.content.startsWith("/uploads/");
            const fileUrl = isFile ? `${BASE}${res.content}` : undefined;
            return (
              <li
                key={res._id || res.id}
                className="p-3 bg-slate-700 rounded-lg flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{res.title}</p>
                  {!isFile && (
                    <p className="text-sm text-slate-400 truncate">
                      {String(res.content)}
                    </p>
                  )}
                  {isFile && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-400 text-sm underline"
                    >
                      View
                    </a>
                  )}
                </div>
                {isFile && (
                  <a
                    href={fileUrl}
                    download
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm"
                  >
                    Download
                  </a>
                )}
              </li>
            );
          })}
          {resources.length === 0 && (
            <p className="text-slate-400">No resources yet.</p>
          )}
        </ul>
      </Card>
    </AnimatedWrapper>
  );
};

export default ResourcesPage;
