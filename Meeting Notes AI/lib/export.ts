export interface ActionItem {
    id: string;
    task: string;
    owner: string;
    deadline: string;
    priority: "high" | "medium" | "low";
}

export interface Decision {
    id: string;
    text: string;
}

export interface MeetingAnalysis {
    title: string;
    summary: string;
    decisions: Decision[];
    action_items: ActionItem[];
    key_points: string[];
    participants: string[];
    sentiment: "positive" | "neutral" | "tense" | "mixed";
}