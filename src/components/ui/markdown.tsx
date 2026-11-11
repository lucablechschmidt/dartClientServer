import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";

/**
 * Markdown as the app's own elements (rules in the setup). A server component: react-markdown runs
 * while the page renders, the phone only gets the finished elements. Raw HTML in the text is rendered
 * (rehype-raw), so the rules can use <details>/<summary> for folding sections; comments stay invisible.
 * That is fine because the texts come only from the repo (src/domain/<mode>/regeln.md), never from users.
 */
const components: Components = {
  h2: ({ children }) => <h3 className="pt-2 font-semibold">{children}</h3>,
  h3: ({ children }) => <h3 className="pt-2 font-semibold">{children}</h3>,
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
