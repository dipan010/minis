import EmailAnalyzer from "../components/EmailAnalyzer";

export const metadata = {
    title: "SentimentScope — Email Sentiment Analyzer",
    description:
        "Paste any email thread and get tone analysis, intent detection, risk level, and 3 ready-to-send reply drafts.",
};

export default function Page() {
    return <EmailAnalyzer />;
}