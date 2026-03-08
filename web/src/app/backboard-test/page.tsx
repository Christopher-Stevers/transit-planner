import { BackboardChatExample } from "~/app/_components/BackboardChatExample";

export default function BackboardTestPage() {
  return (
    <div className="min-h-screen bg-stone-100 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-6 text-3xl font-bold text-stone-900">
          Backboard.io Integration Test
        </h1>
        <BackboardChatExample />
      </div>
    </div>
  );
}
