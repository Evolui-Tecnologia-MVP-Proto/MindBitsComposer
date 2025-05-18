import TextEditor from "@/components/TextEditor";

export default function EditorPage() {
  return (
    <div className="h-full fade-in">
      <h1 className="text-2xl font-bold mb-4">Editor</h1>
      <div className="h-[calc(100vh-200px)]">
        <TextEditor />
      </div>
    </div>
  );
}