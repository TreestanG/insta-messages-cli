export interface Messages {
    participants: Participant[];
    messages: Message[];
    title: string;
    is_still_participant: boolean;
    thread_path: string;
    magic_words: any[];
    joinable_mode: JoinableMode;
}

export interface JoinableMode {
    mode: number;
    link: string;
}

export interface Message {
    sender_name: string;
    timestamp_ms: number;
    content: string;
    is_geoblocked_for_viewer: boolean;
}

export interface Participant {
    name: string;
}
