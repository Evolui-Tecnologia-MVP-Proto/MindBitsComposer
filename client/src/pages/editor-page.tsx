import TextEditor from "@/components/TextEditor";

export default function EditorPage() {
  return (
    <div className="h-full fade-in">
      <div className="h-[calc(100vh-160px)]">
        <TextEditor />
      </div>
    </div>
  );
}