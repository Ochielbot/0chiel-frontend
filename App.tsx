import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    useWindowDimensions,
    ScrollView,
    Pressable,
    Platform,
    Linking,
    Image,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    withDecay,
    cancelAnimation,
    interpolateColor,
    useDerivedValue,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import {
    GestureDetector,
    Gesture,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Camera, Mic } from 'lucide-react-native';
import { DevModeOverlay } from './DevMode';
import { AdminLogin } from './AdminLogin';

// ─── API Service ──────────────────────────────────────────────────────────

const API_BASE = process.env.REACT_APP_API_URL || 'https://0chiel-backend-production.up.railway.app/api';

// Get auth headers
const getAuthHeaders = (): Record<string, string> => {
    const sessionId = localStorage.getItem('ochiel_session');
    return sessionId ? { 'Authorization': `Bearer ${sessionId}` } : {};
};

const api = {
    // Auth
    checkAuth: async () => {
        const response = await fetch(`${API_BASE}/auth/status`, {
            headers: getAuthHeaders()
        });
        return response.json();
    },
    
    login: async (username: string, password: string) => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return response.json();
    },
    
    logout: async () => {
        const response = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        localStorage.removeItem('ochiel_session');
        return response.json();
    },
    
    // Thoughts
    getThoughts: async (space?: string) => {
        const url = space ? `${API_BASE}/thoughts?space=${space}` : `${API_BASE}/thoughts`;
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        return response.json();
    },
    
    createThought: async (thought: any) => {
        const response = await fetch(`${API_BASE}/thoughts`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(thought)
        });
        return response.json();
    },
    
    updateThought: async (id: string, updates: any) => {
        const response = await fetch(`${API_BASE}/thoughts/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(updates)
        });
        return response.json();
    },
    
    deleteThought: async (id: string) => {
        const response = await fetch(`${API_BASE}/thoughts/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return response.json();
    },
    
    // Currently data
    getCurrently: async () => {
        const response = await fetch(`${API_BASE}/currently`);
        return response.json();
    },
    
    updateCurrently: async (data: any) => {
        const response = await fetch(`${API_BASE}/currently`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    
    // Settings
    getSetting: async (key: string) => {
        const response = await fetch(`${API_BASE}/settings/${key}`);
        return response.json();
    },
    
    setSetting: async (key: string, value: any) => {
        const response = await fetch(`${API_BASE}/settings/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
        return response.json();
    }
};

// ─── Types ──────────────────────────────────────────────────────────────────

type Space = 'mind' | 'matter' | 'confluence' | 'void';

type NodeKind = 'fragment' | 'essay' | 'marginal' | 'pinned' | 'media' | 'artifact' | 'riddle' | 'demo' | 'hub' | 'collage';

type MediaType = 'spotify' | 'youtube' | 'wikipedia' | 'iframe' | 'image' | 'voice' | 'text' | 'tiktok' | 'video';

interface MediaContent {
    type: MediaType;
    url?: string;
    embedId?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
}

interface GameElement {
    type: 'pattern' | 'riddle' | 'trivia' | 'chain' | 'algorithm';
    clue?: string;
    solution?: string;
    unlocks?: string[];
    requires?: string[];
    completed?: boolean;
}

interface Thought {
    id: string;
    kind: NodeKind;
    label: string;
    body?: string;
    notes?: string[];
    space: Space;
    pinned?: boolean;
    initialX: number;
    initialY: number;
    media?: MediaContent;
    images?: string[];   // for collage nodes
    game?: GameElement;
    hidden?: boolean;
    discoveredBy?: string[];
    customSize?: { width: number; height: number };  // for resizable nodes
}

// ─── Data ───────────────────────────────────────────────────────────────────

const THOUGHTS: Thought[] = [
    // ── Persona Hubs ──────────────────────────────────────────────────────
    {
        id: 'hub-employers',
        kind: 'hub',
        label: 'here for my work? →',
        body: 'companies · cv · products · demos',
        space: 'matter',
        initialX: -50,
        initialY: -30,
        pinned: true,
    },
    {
        id: 'hub-friends',
        kind: 'hub',
        label: 'just vibing? →',
        body: 'vlogs · ideas · rabbit holes',
        space: 'mind',
        initialX: 60,
        initialY: 50,
        pinned: true,
    },
    {
        id: 'hub-builders',
        kind: 'hub',
        label: 'building something? →',
        body: 'products · collabs · tools',
        space: 'confluence',
        initialX: 10,
        initialY: -90,
    },

    // ── Companies / Projects ───────────────────────────────────────────────
    {
        id: 'qpid',
        kind: 'artifact',
        label: 'qpid technologies',
        body: 'my software company. building tools for the next generation of founders.',
        space: 'matter',
        initialX: -290,
        initialY: -170,
        media: {
            type: 'iframe',
            url: 'https://qpid-technologies.vercel.app/',
            title: 'qpid technologies',
            description: 'software company — visit site',
        },
    },
    {
        id: 'bookmarked',
        kind: 'artifact',
        label: 'bookmarked.',
        body: 'my app. save what matters, find it when you need it.',
        space: 'matter',
        initialX: 260,
        initialY: -210,
        media: {
            type: 'iframe',
            url: 'https://bookmarked-website.vercel.app',
            title: 'bookmarked',
            description: 'your personal save layer',
        },
    },
    {
        id: 'greatlist',
        kind: 'artifact',
        label: 'greatlist — waitlist',
        body: 'something new is coming. join the list.',
        space: 'matter',
        initialX: -340,
        initialY: 80,
        media: {
            type: 'iframe',
            url: 'https://www.greatlist.cc',
            title: 'greatlist',
            description: 'join the waitlist',
        },
    },
    {
        id: 'fiesta',
        kind: 'artifact',
        label: 'fiesta — party games',
        body: 'making gatherings unforgettable. games for the people.',
        space: 'matter',
        initialX: 320,
        initialY: 100,
        media: {
            type: 'iframe',
            url: 'https://fiestagames.app/',
            title: 'fiesta games',
            description: 'party games app',
        },
    },

    // ── Hardware ──────────────────────────────────────────────────────────
    {
        id: 'arduino-build',
        kind: 'media',
        label: 'build: arduino project',
        space: 'confluence',
        initialX: 190,
        initialY: 220,
        media: {
            type: 'video',
            url: '/Video.MP4',
            title: 'hardware build',
            description: 'arduino project — hands on',
        },
    },

    // ── YouTube ───────────────────────────────────────────────────────────
    {
        id: 'yt-genius',
        kind: 'media',
        label: "you're not a genius, get help",
        space: 'mind',
        initialX: -260,
        initialY: -110,
        media: {
            type: 'youtube',
            embedId: 'vgEufQ7FwtI',
            title: "you're not a genius, get help",
            description: 'a reflection on ego and collaboration',
        },
    },
    {
        id: 'yt-novelty',
        kind: 'media',
        label: 'chasing novelty',
        space: 'mind',
        initialX: 210,
        initialY: -70,
        media: {
            type: 'youtube',
            embedId: 'qrE4xHsYGfA',
            title: 'chasing novelty',
            description: 'on the restlessness of always wanting the new thing',
        },
    },

    // ── TikToks ───────────────────────────────────────────────────────────
    {
        id: 'tiktok-1',
        kind: 'media',
        label: 'week in the life: startup founder',
        space: 'mind',
        initialX: -180,
        initialY: 170,
        media: {
            type: 'tiktok',
            embedId: '7557053039962574092',
            title: 'week 1 — kenyan startup founder',
            description: 'everything i did in a week',
        },
    },
    {
        id: 'tiktok-2',
        kind: 'media',
        label: 'university finale vlog',
        space: 'mind',
        initialX: 340,
        initialY: 150,
        media: {
            type: 'tiktok',
            embedId: '7562237150499114251',
            title: 'vlog: capping off university',
            description: 'end of an era',
        },
    },
    {
        id: 'tiktok-3',
        kind: 'media',
        label: 'fiesta v2 soft launch week',
        space: 'confluence',
        initialX: -90,
        initialY: -250,
        media: {
            type: 'tiktok',
            embedId: '7569962648704453899',
            title: 'week in the life: fiesta launch',
            description: 'from early mornings to late nights',
        },
    },

    // ── Thought Fragments ─────────────────────────────────────────────────
    {
        id: 'f1',
        kind: 'fragment',
        label: 'entropy is just order in disguise',
        space: 'mind',
        initialX: -300,
        initialY: -180,
    },
    {
        id: 'f2',
        kind: 'fragment',
        label: 'the gap between thought and form',
        space: 'mind',
        initialX: 80,
        initialY: -260,
    },
    {
        id: 'f3',
        kind: 'fragment',
        label: 'memory as compression artifact',
        space: 'mind',
        initialX: -100,
        initialY: 180,
    },
    {
        id: 'f4',
        kind: 'fragment',
        label: 'silence between notes is also music',
        space: 'mind',
        initialX: 260,
        initialY: 60,
    },
    {
        id: 'e1',
        kind: 'essay',
        label: 'on the texture of incomplete ideas',
        body: `an idea before it has language is not shapeless — it has a texture, a weight. it presses against you from inside.\n\nwe mistake the absence of words for the absence of thought. but sometimes the most formed things resist articulation longest.\n\nto capture an idea too early is to flatten it.`,
        notes: ["wittgenstein's ladder", 'see: merleau-ponty', 'cf. haiku form'],
        space: 'mind',
        initialX: -180,
        initialY: -60,
        pinned: true,
    },
    {
        id: 'e2',
        kind: 'essay',
        label: 'objects as thought containers',
        body: `matter holds intention. a worn tool carries the memory of every use. a notebook left open mid-page contains a decision suspended in time.\n\nthings are not passive. they participate in the thinking that surrounds them.\n\nto arrange objects is to arrange thought.`,
        notes: ['extended cognition', 'clark & chalmers', 'the pile on the desk'],
        space: 'matter',
        initialX: 200,
        initialY: -120,
    },
    {
        id: 'm1',
        kind: 'marginal',
        label: '↳ reminds me of leibniz monads',
        space: 'mind',
        initialX: -340,
        initialY: 80,
    },
    {
        id: 'm2',
        kind: 'marginal',
        label: '↳ see also: the ship of theseus',
        space: 'mind',
        initialX: 140,
        initialY: 220,
    },
    {
        id: 'p1',
        kind: 'fragment',
        label: 'draft: spatial memory palace v2',
        space: 'matter',
        initialX: -200,
        initialY: 140,
    },
    {
        id: 'p2',
        kind: 'fragment',
        label: '0chiel — a living archive',
        space: 'matter',
        initialX: 60,
        initialY: -180,
    },
    {
        id: 'p3',
        kind: 'fragment',
        label: 'photo: studio setup',
        space: 'matter',
        initialX: -80,
        initialY: 240,
    },
    {
        id: 'p4',
        kind: 'essay',
        label: 'workshop notes: feb 2026',
        body: `collected observations from the studio month:\n\n— working flat feels different from working tall\n— the desk surface as a thinking surface\n— afternoon light as a collaborator\n— stacking things changes what they mean`,
        notes: ['see photos folder', 'share w/ yemi'],
        space: 'matter',
        initialX: 300,
        initialY: 180,
    },
    // Media artifacts
    {
        id: 'med1',
        kind: 'media',
        label: 'ambient: thinking music',
        space: 'mind',
        initialX: -250,
        initialY: 120,
        media: {
            type: 'spotify',
            embedId: '4uLU6hMCjMI75M1A2tKUQC',
            title: 'ambient thinking music',
            description: 'for deep work sessions'
        }
    },
    {
        id: 'med2',
        kind: 'media',
        label: 'video: emergence patterns',
        space: 'confluence',
        initialX: 180,
        initialY: -80,
        media: {
            type: 'youtube',
            embedId: 'dQw4w9WgXcQ',
            title: 'emergence in complex systems',
            description: 'how simple rules create complex behavior'
        }
    },
    {
        id: 'med3',
        kind: 'media',
        label: 'ref: extended mind thesis',
        space: 'mind',
        initialX: 120,
        initialY: 180,
        media: {
            type: 'wikipedia',
            url: 'https://en.wikipedia.org/wiki/Extended_mind_thesis',
            title: 'Extended Mind Thesis',
            description: 'clark & chalmers foundational paper'
        }
    },
    // CS Demonstrations
    {
        id: 'demo1',
        kind: 'demo',
        label: 'viz: sorting algorithms',
        space: 'confluence',
        initialX: -120,
        initialY: -200,
        body: 'interactive visualization of merge sort vs quicksort',
        game: {
            type: 'algorithm',
            clue: 'which algorithm maintains stability?',
            solution: 'merge sort',
            unlocks: ['demo2']
        }
    },
    {
        id: 'demo2',
        kind: 'demo',
        label: 'sim: cellular automata',
        space: 'confluence',
        initialX: 240,
        initialY: 120,
        body: 'conway\'s game of life with custom rules',
        hidden: true
    },
    // Riddles and puzzles
    {
        id: 'riddle1',
        kind: 'riddle',
        label: '?',
        space: 'mind',
        initialX: 320,
        initialY: -40,
        body: 'i am the space between thoughts, the pause between breaths. what am i?',
        game: {
            type: 'riddle',
            solution: 'silence',
            unlocks: ['void1']
        }
    },
    // Void space (hidden)
    {
        id: 'void-welcome',
        kind: 'essay',
        label: 'welcome to the void',
        body: `this is the bathroom wall of the internet.\n\nif you're not me, your thoughts live here. scribble whatever you want — a confession, a question, a fragment of something you can't say anywhere else.\n\nleave your name or don't. mark the date or let it float in time.\n\nthis is the space for everything that doesn't fit anywhere else.`,
        space: 'void',
        initialX: 0,
        initialY: -150,
        pinned: true,
        customSize: { width: 400, height: 280 },
    },
    {
        id: 'void1',
        kind: 'fragment',
        label: 'whisper: someone was here',
        space: 'void',
        initialX: 0,
        initialY: 0,
        body: 'traces of previous visitors...',
        hidden: true
    },
    {
        id: 'void2',
        kind: 'fragment',
        label: 'echo: the system dreams',
        space: 'void',
        initialX: -150,
        initialY: 100,
        body: 'when no one is watching, what does the interface think about?',
        hidden: true
    },
    {
        id: 'void3',
        kind: 'marginal',
        label: '↳ left by visitor_7829',
        space: 'void',
        initialX: 200,
        initialY: -80,
        body: 'beautiful system. reminds me of my grandmother\'s garden.',
        hidden: true,
    },
    // ── Pottery / Art ──────────────────────────────────────────────────────
    {
        id: 'pottery',
        kind: 'collage',
        label: 'pottery — making things with hands',
        body: 'throwing clay, finding form',
        space: 'matter',
        initialX: -320,
        initialY: 200,
        media: {
            type: 'video',
            url: '/pottery.MOV',
            title: 'pottery session',
        },
        images: ['/pottery.jpg', '/pottery3.jpg', '/pottery final.jpg'],
    },
    // ── Meta: how this site works (removed — replaced by dev mode chip)
];

// ─── Space Config ────────────────────────────────────────────────────────────

const SPACE_BG: Record<Space, string> = {
    mind: '#000000',
    matter: '#f5f5f0',
    confluence: '#2a2a28', // Darker for yellow accent
    void: '#0a1420', // Washed dark blue for void
};

const SPACE_FG: Record<Space, string> = {
    mind: '#ffffff',
    matter: '#111111',
    confluence: '#ffffff',
    void: '#6b9dc4', // Washed blue text for void
};

// Soft yellow accent color
const ACCENT_COLOR = '#f4e4a6'; // Soft yellow
const ACCENT_COLOR_MUTED = '#f4e4a680';

const SPACE_NODE_BG: Record<Space, { mind: string; matter: string; confluence: string; void: string }> = {
    // mind bg = #000  → nodes must read against black
    mind: {
        mind: '#181818',    // dark fill, clearly off-black
        matter: '#1c1c1c',  // slightly lighter dark so border shows
        confluence: '#222222',
        void: '#0f0f0f',
    },
    // matter bg = #f5f5f0 → nodes must read against off-white
    matter: {
        mind: '#d8d8d4',    // medium grey, clearly darker than bg
        matter: '#ffffff',  // pure white pops against #f5f5f0
        confluence: '#e0e0dc',
        void: '#c8c8c4',
    },
    // confluence bg = #2a2a28 → darker background for yellow accent
    confluence: {
        mind: '#1e1e1e',
        matter: '#f0f0ec',
        confluence: ACCENT_COLOR, // Use soft yellow for confluence nodes
        void: '#2a2a2a',
    },
    // void bg = #0a1420 → washed dark blue
    void: {
        mind: '#1a2a3a',
        matter: '#2a3a4a',
        confluence: '#3a4a5a',
        void: '#152535',
    },
};

const SPACE_NODE_TEXT: Record<Space, { mind: string; matter: string; confluence: string; void: string }> = {
    mind: { mind: '#e8e8e8', matter: '#aaaaaa', confluence: '#cccccc', void: '#666666' },
    matter: { mind: '#222222', matter: '#111111', confluence: '#333333', void: '#444444' },
    confluence: { mind: '#e8e8e8', matter: '#111111', confluence: '#000000', void: '#888888' },
    void: { mind: '#5a8ab4', matter: '#7a9ab4', confluence: '#6a8ab4', void: '#6b9dc4' },
};

// Per-space, per-origin border — always contrasts with the space bg
const SPACE_NODE_BORDER: Record<Space, { mind: string; matter: string; confluence: string; void: string }> = {
    mind: { mind: '#383838', matter: '#303030', confluence: '#404040', void: '#1a1a1a' },
    matter: { mind: '#aaaaaa', matter: '#cccccc', confluence: '#999999', void: '#888888' },
    confluence: { mind: '#444444', matter: '#999999', confluence: '#777777', void: '#333333' },
    void: { mind: '#2a3a4a', matter: '#3a4a5a', confluence: '#4a5a6a', void: '#3a5a7a' },
};

// ─── Media Embed ───────────────────────────────────────────────────────────

const MediaEmbed = ({ media, currentSpace }: {
    media: MediaContent;
    currentSpace: Space;
}) => {
    const fg = currentSpace === 'matter' ? '#111' : '#f0f0f0';
    const fgMuted = currentSpace === 'matter' ? '#777' : '#555';

    const renderEmbed = () => {
        switch (media.type) {
            case 'spotify':
                return (
                    <View style={styles.iframeContainer}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                src={`https://open.spotify.com/embed/track/${media.embedId}`}
                                width="100%"
                                height="152"
                                frameBorder="0"
                                allow="encrypted-media"
                                style={{ borderRadius: 4 }}
                            />
                        ) : (
                            <Text style={[styles.embedPlaceholder, { color: fgMuted }]}>
                                spotify embed (web only)
                            </Text>
                        )}
                    </View>
                );
            case 'youtube':
                return (
                    <View style={styles.iframeContainer}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                width="100%"
                                height="315"
                                src={`https://www.youtube.com/embed/${media.embedId}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ borderRadius: 4 }}
                            />
                        ) : (
                            <Text style={[styles.embedPlaceholder, { color: fgMuted }]}>
                                youtube embed (web only)
                            </Text>
                        )}
                    </View>
                );
            case 'wikipedia':
                return (
                    <View style={styles.iframeContainer}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                src={media.url}
                                width="100%"
                                height="400"
                                frameBorder="0"
                                style={{ borderRadius: 4, backgroundColor: '#fff' }}
                            />
                        ) : (
                            <Text style={[styles.embedPlaceholder, { color: fgMuted }]}>
                                wikipedia article (web only)
                            </Text>
                        )}
                    </View>
                );
            case 'iframe':
                return (
                    <View style={styles.iframeContainer}>
                        {Platform.OS === 'web' && media.url ? (
                            <iframe
                                src={media.url}
                                width="100%"
                                height="400"
                                frameBorder="0"
                                style={{ borderRadius: 4 }}
                            />
                        ) : (
                            <Text style={[styles.embedPlaceholder, { color: fgMuted }]}>
                                iframe embed (web only)
                            </Text>
                        )}
                    </View>
                );
            case 'tiktok':
                return (
                    <View style={styles.iframeContainer}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                src={`https://www.tiktok.com/embed/v2/${media.embedId}`}
                                width="100%"
                                height="700"
                                frameBorder="0"
                                allowFullScreen
                                style={{ borderRadius: 8 }}
                            />
                        ) : (
                            <Text style={[styles.embedPlaceholder, { color: fgMuted }]}>tiktok (web only)</Text>
                        )}
                    </View>
                );
            case 'video':
                return (
                    <View style={styles.iframeContainer}>
                        {Platform.OS === 'web' && media.url
                            ? React.createElement('video', {
                                src: media.url,
                                controls: true,
                                style: { width: '100%', borderRadius: 6, maxHeight: 400, display: 'block' },
                            })
                            : <Text style={[styles.embedPlaceholder, { color: fgMuted }]}>video (web only)</Text>
                        }
                    </View>
                );
            default:
                return (
                    <View style={styles.embedContainer}>
                        <Text style={[styles.embedPlaceholder, { color: fg }]}>
                            {media.description || 'media content'}
                        </Text>
                    </View>
                );
        }
    };

    return (
        <View style={styles.mediaEmbedWrapper}>
            {media.title && (
                <Text style={[styles.mediaTitle, { color: fgMuted }]}>
                    {media.title}
                </Text>
            )}
            {renderEmbed()}
            {media.description && media.type !== 'text' && (
                <Text style={[styles.mediaDescription, { color: fgMuted }]}>
                    {media.description}
                </Text>
            )}
        </View>
    );
};

// ─── Resize Handle Component ─────────────────────────────────────────────────

const ResizeHandle = ({ 
    nodeId, 
    currentSize, 
    onResizeStart, 
    onResizeEnd, 
    nodeText 
}: {
    nodeId: string;
    currentSize: { width: number; height: number | string };
    onResizeStart: () => void;
    onResizeEnd: (size: { width: number; height: number }) => void;
    nodeText: string;
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startSize, setStartSize] = useState(currentSize);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const resizeGesture = Gesture.Pan()
        .onBegin((event) => {
            setIsDragging(true);
            setStartSize(currentSize);
            setStartPos({ x: event.absoluteX, y: event.absoluteY });
            onResizeStart();
        })
        .onChange((event) => {
            const deltaX = event.absoluteX - startPos.x;
            const deltaY = event.absoluteY - startPos.y;
            
            // Allow both horizontal and vertical resizing
            const newWidth = Math.max(120, (startSize.width as number) + deltaX);
            const newHeight = Math.max(80, startSize.height === 'auto' ? 120 + deltaY : (startSize.height as number) + deltaY);
            
            const newSize = { width: newWidth, height: newHeight };
            onResizeEnd(newSize); // Update in real-time for visual feedback
        })
        .onFinalize(() => {
            setIsDragging(false);
        });

    return (
        <GestureDetector gesture={resizeGesture}>
            <View style={[
                styles.nodeControlResize, 
                { 
                    borderColor: nodeText + '40',
                    backgroundColor: isDragging ? nodeText + '20' : 'transparent'
                },
            ]}>
                <Text style={[styles.nodeControlText, { color: nodeText, opacity: isDragging ? 0.8 : 0.5 }]}>
                    ⋱
                </Text>
            </View>
        </GestureDetector>
    );
};

// ─── Floating Node ─────────────────────────────────────────────────────────

interface NodeProps {
    thought: Thought;
    currentSpace: Space;
    cx: number;
    cy: number;
    isPinned: boolean;
    onPin: (id: string) => void;
    onResize: (id: string, size: { width: number; height: number }) => void;
    nodeSize?: { width: number; height: number };
    onExpand: (thought: Thought) => void;
    recenterTrigger: number;
}

const FloatingNode = ({
    thought,
    currentSpace,
    cx,
    cy,
    isPinned,
    onPin,
    onResize,
    nodeSize,
    onExpand,
    recenterTrigger,
}: NodeProps) => {
    const x = useSharedValue(thought.initialX);
    const y = useSharedValue(thought.initialY);
    const scale = useSharedValue(1);
    const pinScale = useSharedValue(isPinned ? 1.1 : 1);
    const pulseScale = useSharedValue(1);
    const hoverOffset = useSharedValue(0);
    const isHovered = useSharedValue(false);
    const [isResizing, setIsResizing] = useState(false);

    const driftDuration = 3500 + (thought.id.charCodeAt(1) % 7) * 500;
    const driftAmp = thought.kind === 'essay' ? 15 : thought.kind === 'marginal' ? 8 : 25;

    // Default sizes based on node type
    const getDefaultSize = () => {
        const isCollage = thought.kind === 'collage';
        const isHub = thought.kind === 'hub';
        const isArtifact = thought.kind === 'artifact';
        const isMedia = thought.kind === 'media';
        const isEssay = thought.kind === 'essay';
        const isMarginal = thought.kind === 'marginal';

        const defaultWidth = isCollage ? 260 : isHub ? 220 : isArtifact || isMedia ? 300 : isEssay ? 240 : isMarginal ? 200 : 180;
        return { width: defaultWidth, height: 'auto' };
    };

    const currentSize = nodeSize || getDefaultSize();
    
    // Ensure minimum size to prevent unusable nodes
    const constrainedSize = {
        width: Math.max(120, currentSize.width),
        height: currentSize.height === 'auto' ? 'auto' : Math.max(80, currentSize.height as number)
    };

    useEffect(() => {
        if (recenterTrigger === 0) return;
        cancelAnimation(x);
        cancelAnimation(y);
        x.value = withSpring(thought.initialX, { damping: 14, stiffness: 90, mass: 1.2 });
        y.value = withSpring(thought.initialY, { damping: 14, stiffness: 90, mass: 1.2 });
    }, [recenterTrigger]);

    useEffect(() => {
        if (isPinned) {
            cancelAnimation(x);
            cancelAnimation(y);
            return;
        }
        x.value = withRepeat(
            withSequence(
                withTiming(thought.initialX + driftAmp, { duration: driftDuration, easing: Easing.inOut(Easing.sin) }),
                withTiming(thought.initialX - driftAmp * 0.6, { duration: driftDuration * 0.8, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        y.value = withRepeat(
            withSequence(
                withTiming(thought.initialY + driftAmp * 0.7, { duration: driftDuration * 1.2, easing: Easing.inOut(Easing.sin) }),
                withTiming(thought.initialY - driftAmp * 0.5, { duration: driftDuration, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        return () => {
            cancelAnimation(x);
            cancelAnimation(y);
        };
    }, [isPinned]);

    useEffect(() => {
        pinScale.value = withSpring(isPinned ? 1.08 : 1);
    }, [isPinned]);

    const isEssay = thought.kind === 'essay';
    const isMarginal = thought.kind === 'marginal';
    const isMedia = thought.kind === 'media';
    const isCollage = thought.kind === 'collage';
    const isDemo = thought.kind === 'demo';
    const isRiddle = thought.kind === 'riddle';
    const isHub = thought.kind === 'hub';
    const isArtifact = thought.kind === 'artifact';

    const handlePress = () => {
        if (isEssay || isMedia || isDemo || isRiddle || isHub || isArtifact || isCollage) {
            onExpand(thought);
        }
    };

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            if (isResizing) return;
            cancelAnimation(x);
            cancelAnimation(y);
            scale.value = withSpring(1.15);
        })
        .onChange((e) => {
            if (isResizing) return;
            x.value += e.changeX;
            y.value += e.changeY;
        })
        .onFinalize((e) => {
            if (isResizing) return;
            scale.value = withSpring(1);
            x.value = withDecay({ velocity: e.velocityX });
            y.value = withDecay({ velocity: e.velocityY });
        });

    const tapGesture = Gesture.Tap()
        .maxDuration(250)
        .onEnd((_e, success) => {
            if (success && !isResizing) runOnJS(handlePress)();
        });

    const composedGesture = Gesture.Race(tapGesture, panGesture);

    const nodeBg = SPACE_NODE_BG[currentSpace][thought.space as keyof typeof SPACE_NODE_BG[Space]];
    const nodeText = SPACE_NODE_TEXT[currentSpace][thought.space as keyof typeof SPACE_NODE_TEXT[Space]];
    const nodeBorder = isPinned
        ? nodeText
        : SPACE_NODE_BORDER[currentSpace][thought.space as keyof typeof SPACE_NODE_BORDER[Space]];

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: cx + x.value },
            { translateY: cy + y.value + hoverOffset.value },
            { scale: scale.value * pinScale.value * pulseScale.value },
        ],
        opacity: withTiming(1, { duration: 400 }),
    }));

    const handleMouseEnter = () => {
        hoverOffset.value = withSpring(-4, { damping: 15, stiffness: 150 });
        pulseScale.value = withRepeat(
            withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.sin) }),
            -1, true
        );
    };

    const handleMouseLeave = () => {
        hoverOffset.value = withSpring(0);
        pulseScale.value = withTiming(1, { duration: 300 });
    };

    const kindBadge = isHub ? '⊕ for you'
        : isArtifact ? '◈ project'
            : isEssay ? '— essay'
                : isMarginal ? '↳ note'
                    : isMedia ? '◉ media'
                        : isCollage ? '▦ collage'
                            : isDemo ? '◈ demo'
                                : isRiddle ? '? riddle'
                                    : '·';

    const handleResizeStart = () => {
        setIsResizing(true);
    };

    const handleResizeEnd = (newSize: { width: number; height: number }) => {
        setIsResizing(false);
        onResize(thought.id, newSize);
    };

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View
                {...({
                    onMouseEnter: handleMouseEnter,
                    onMouseLeave: handleMouseLeave,
                } as any)}
                style={[
                    styles.node,
                    animatedStyle,
                    isHub && styles.nodeHub,
                    isCollage && styles.nodeCollage,
                    {
                        backgroundColor: nodeBg,
                        borderColor: isPinned ? nodeText : nodeBorder,
                        borderWidth: isPinned ? 2 : 1,
                        shadowColor: isPinned ? nodeText : 'transparent',
                        width: constrainedSize.width,
                        height: constrainedSize.height !== 'auto' ? constrainedSize.height : undefined,
                        maxWidth: undefined, // Remove maxWidth constraint when custom size is set
                    },
                ]}>

                {/* Pin button - top right inside */}
                <TouchableOpacity
                    style={[styles.nodeControlPin, { borderColor: nodeText + '40' }]}
                    onPress={() => onPin(thought.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Text style={[styles.nodeControlText, { color: nodeText, opacity: isPinned ? 0.9 : 0.5 }]}>
                        ⊙
                    </Text>
                </TouchableOpacity>

                {/* Resize handle - bottom right */}
                <ResizeHandle
                    nodeId={thought.id}
                    currentSize={constrainedSize}
                    onResizeStart={handleResizeStart}
                    onResizeEnd={handleResizeEnd}
                    nodeText={nodeText}
                />

                <Text style={[styles.nodeKind, { color: nodeText, opacity: isHub ? 0.7 : 0.45 }]}>
                    {kindBadge}
                </Text>

                <Text style={[
                    styles.nodeLabel,
                    isEssay && styles.nodeLabelEssay,
                    isMarginal && styles.nodeLabelMarginal,
                    isHub && styles.nodeLabelHub,
                    { color: nodeText },
                ]}>
                    {thought.label}
                </Text>

                {isHub && thought.body && (
                    <Text style={[styles.nodeHubSub, { color: nodeText }]}>{thought.body}</Text>
                )}

                {/* Show body text for non-hub nodes when they're large enough */}
                {!isHub && thought.body && constrainedSize.width > 200 && (
                    <Text 
                        style={[
                            styles.nodeBody, 
                            { color: nodeText, opacity: 0.7 }
                        ]}
                        numberOfLines={constrainedSize.height !== 'auto' ? Math.floor(((constrainedSize.height as number) - 100) / 16) : 3}
                    >
                        {thought.body}
                    </Text>
                )}

                {/* Media preview for any node with media */}
                {!isCollage && thought.media && (
                    <View style={styles.nodeMediaPreview}>
                        {thought.media.type === 'spotify' && Platform.OS === 'web' && thought.media.embedId && (
                            <View style={styles.nodeMediaEmbed}>
                                {React.createElement('iframe', {
                                    src: `https://open.spotify.com/embed/track/${thought.media.embedId}?utm_source=generator&theme=0`,
                                    width: '100%',
                                    height: constrainedSize.height !== 'auto' ? Math.max(152, (constrainedSize.height as number) - 60) : 152,
                                    frameBorder: '0',
                                    allow: 'encrypted-media',
                                    style: { borderRadius: 4, display: 'block' }
                                })}
                            </View>
                        )}
                        {thought.media.type === 'youtube' && Platform.OS === 'web' && thought.media.embedId && (
                            <View style={styles.nodeMediaEmbed}>
                                {React.createElement('iframe', {
                                    width: '100%',
                                    height: constrainedSize.height !== 'auto' ? Math.max(200, (constrainedSize.height as number) - 60) : 200,
                                    src: `https://www.youtube.com/embed/${thought.media.embedId}`,
                                    frameBorder: '0',
                                    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                                    style: { borderRadius: 4, display: 'block' }
                                })}
                            </View>
                        )}
                        {thought.media.type === 'tiktok' && Platform.OS === 'web' && thought.media.embedId && (
                            <View style={styles.nodeMediaEmbed}>
                                {React.createElement('iframe', {
                                    src: `https://www.tiktok.com/embed/v2/${thought.media.embedId}`,
                                    width: '100%',
                                    height: constrainedSize.height !== 'auto' ? Math.max(400, (constrainedSize.height as number) - 60) : 400,
                                    frameBorder: '0',
                                    allowFullScreen: true,
                                    style: { borderRadius: 8, display: 'block' }
                                })}
                            </View>
                        )}
                        {!thought.media.embedId && (
                            <Text style={[styles.nodeMediaHint, { color: nodeText, opacity: 0.6 }]}>
                                tap to open ↗
                            </Text>
                        )}
                    </View>
                )}

                {/* Collage node: video + images side-by-side */}
                {isCollage && Platform.OS === 'web' && (
                    <View style={[
                        styles.collageGrid,
                        { height: constrainedSize.height !== 'auto' ? Math.max(140, (constrainedSize.height as number) - 80) : 140 }
                    ]}>
                        {thought.media?.url && (
                            <View style={styles.collageVideo}>
                                {React.createElement('video', {
                                    src: thought.media.url,
                                    autoPlay: true, muted: true, loop: true, playsInline: true,
                                    style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block' },
                                })}
                            </View>
                        )}
                        {(thought.images ?? []).length > 0 && (
                            <View style={styles.collageImages}>
                                {(thought.images ?? []).map((src, i) => {
                                    const collageHeight = constrainedSize.height !== 'auto' ? Math.max(140, (constrainedSize.height as number) - 80) : 140;
                                    return React.createElement('img', {
                                        key: i, src,
                                        style: { 
                                            width: '100%', 
                                            height: Math.floor(collageHeight / (thought.images!.length)), 
                                            objectFit: 'cover', 
                                            borderRadius: 3, 
                                            display: 'block', 
                                            marginBottom: i < (thought.images!.length - 1) ? 3 : 0 
                                        },
                                    });
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* Collage node: mobile version */}
                {isCollage && Platform.OS !== 'web' && (
                    <View style={[
                        styles.collageMobile,
                        { height: constrainedSize.height !== 'auto' ? Math.max(120, (constrainedSize.height as number) - 80) : 120 }
                    ]}>
                        {thought.media?.url && (
                            <View style={styles.collageVideoMobile}>
                                <Text style={[styles.nodeMediaHint, { color: nodeText, opacity: 0.6 }]}>
                                    video ↗
                                </Text>
                            </View>
                        )}
                        {(thought.images ?? []).length > 0 && (
                            <View style={styles.collageImagesMobile}>
                                {(thought.images ?? []).map((src, i) => {
                                    const collageHeight = constrainedSize.height !== 'auto' ? Math.max(120, (constrainedSize.height as number) - 80) : 120;
                                    return (
                                        <Image
                                            key={i}
                                            source={{ uri: src }}
                                            style={[
                                                styles.collageImageMobile,
                                                { height: Math.floor(collageHeight / (thought.images!.length)) }
                                            ]}
                                            resizeMode="cover"
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {isMedia && thought.media && (
                    <View style={styles.nodeMediaPreview}>
                        {thought.media.type === 'spotify' && Platform.OS === 'web' && (
                            <View style={styles.nodeMediaEmbed}>
                                <iframe
                                    src={`https://open.spotify.com/embed/track/${thought.media.embedId}?utm_source=generator&theme=0`}
                                    width="100%" 
                                    height={constrainedSize.height !== 'auto' ? Math.max(80, (constrainedSize.height as number) - 60) : 80} 
                                    frameBorder="0"
                                    allow="encrypted-media" style={{ borderRadius: 4 }}
                                />
                            </View>
                        )}
                        {thought.media.type === 'youtube' && Platform.OS === 'web' && (
                            <View style={styles.nodeMediaEmbed}>
                                <iframe 
                                    width="100%" 
                                    height={constrainedSize.height !== 'auto' ? Math.max(140, (constrainedSize.height as number) - 60) : 140}
                                    src={`https://www.youtube.com/embed/${thought.media.embedId}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    style={{ borderRadius: 4 }}
                                />
                            </View>
                        )}
                        {(thought.media.type === 'tiktok' || thought.media.type === 'video' ||
                            thought.media.type === 'wikipedia' || thought.media.type === 'iframe') && (
                                <Text style={[styles.nodeMediaHint, { color: nodeText, opacity: 0.6 }]}>
                                    media ↗
                                </Text>
                            )}
                    </View>
                )}

                {isArtifact && (
                    <Text style={[styles.nodeMediaHint, { color: nodeText, opacity: 0.55, marginTop: 4 }]}>
                        project ↗
                    </Text>
                )}
            </Animated.View>
        </GestureDetector>
    );
}

// ─── Simple Markdown Renderer ──────────────────────────────────────────────────

const MarkdownText = ({ text, style, baseColor }: { text: string; style?: any; baseColor?: string }) => {
    const lines = text.split('\n');
    const color = baseColor || style?.color || '#f0f0f0';
    
    return (
        <View>
            {lines.map((line, i) => {
                // Heading: # text
                if (line.startsWith('# ')) {
                    return (
                        <Text key={i} style={[style, { 
                            fontSize: 26, 
                            fontWeight: '700', 
                            marginTop: i > 0 ? 20 : 0, 
                            marginBottom: 12,
                            color 
                        }]}>
                            {line.substring(2)}
                        </Text>
                    );
                }
                
                // Heading 2: ## text
                if (line.startsWith('## ')) {
                    return (
                        <Text key={i} style={[style, { 
                            fontSize: 22, 
                            fontWeight: '600', 
                            marginTop: i > 0 ? 16 : 0, 
                            marginBottom: 10,
                            color 
                        }]}>
                            {line.substring(3)}
                        </Text>
                    );
                }
                
                // Heading 3: ### text
                if (line.startsWith('### ')) {
                    return (
                        <Text key={i} style={[style, { 
                            fontSize: 18, 
                            fontWeight: '600', 
                            marginTop: i > 0 ? 12 : 0, 
                            marginBottom: 8,
                            color 
                        }]}>
                            {line.substring(4)}
                        </Text>
                    );
                }
                
                // List item: — text or - text
                if (line.startsWith('— ') || line.startsWith('- ')) {
                    return (
                        <Text key={i} style={[style, { marginLeft: 16, marginBottom: 6, color }]}>
                            — {line.substring(2)}
                        </Text>
                    );
                }
                
                // Blockquote: > text
                if (line.startsWith('> ')) {
                    return (
                        <View key={i} style={{ 
                            borderLeftWidth: 3, 
                            borderLeftColor: color + '40',
                            paddingLeft: 16,
                            marginVertical: 8,
                            backgroundColor: color + '05'
                        }}>
                            <Text style={[style, { fontStyle: 'italic', opacity: 0.85, color }]}>
                                {line.substring(2)}
                            </Text>
                        </View>
                    );
                }
                
                // Horizontal rule: ---
                if (line.trim() === '---' || line.trim() === '***') {
                    return (
                        <View key={i} style={{ 
                            height: 1, 
                            backgroundColor: color + '30',
                            marginVertical: 16 
                        }} />
                    );
                }
                
                // Empty line
                if (line.trim() === '') {
                    return <View key={i} style={{ height: 12 }} />;
                }
                
                // Regular text with inline formatting
                const parts = [];
                let currentPos = 0;
                let key = 0;
                
                // Parse **bold**, *italic*, `code`, ~~strikethrough~~
                const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g;
                let match;
                
                while ((match = regex.exec(line)) !== null) {
                    // Add text before match
                    if (match.index > currentPos) {
                        parts.push(
                            <Text key={`${i}-${key++}`}>{line.substring(currentPos, match.index)}</Text>
                        );
                    }
                    
                    // Add formatted text
                    const matched = match[0];
                    if (matched.startsWith('**')) {
                        parts.push(
                            <Text key={`${i}-${key++}`} style={{ fontWeight: '700' }}>
                                {matched.substring(2, matched.length - 2)}
                            </Text>
                        );
                    } else if (matched.startsWith('~~')) {
                        parts.push(
                            <Text key={`${i}-${key++}`} style={{ textDecorationLine: 'line-through', opacity: 0.6 }}>
                                {matched.substring(2, matched.length - 2)}
                            </Text>
                        );
                    } else if (matched.startsWith('`')) {
                        parts.push(
                            <Text key={`${i}-${key++}`} style={{ 
                                fontFamily: 'Courier',
                                fontSize: (style?.fontSize || 19) * 0.9,
                                backgroundColor: color + '10',
                                paddingHorizontal: 4,
                                paddingVertical: 2,
                                borderRadius: 3
                            }}>
                                {matched.substring(1, matched.length - 1)}
                            </Text>
                        );
                    } else {
                        parts.push(
                            <Text key={`${i}-${key++}`} style={{ fontStyle: 'italic' }}>
                                {matched.substring(1, matched.length - 1)}
                            </Text>
                        );
                    }
                    
                    currentPos = regex.lastIndex;
                }
                
                // Add remaining text
                if (currentPos < line.length) {
                    parts.push(
                        <Text key={`${i}-${key++}`}>{line.substring(currentPos)}</Text>
                    );
                }
                
                return (
                    <Text key={i} style={[style, { marginBottom: 8, color }]}>
                        {parts.length > 0 ? parts : line}
                    </Text>
                );
            })}
        </View>
    );
};

// ─── Typewriter Effect ───────────────────────────────────────────────────────

const TypewriterText = ({ 
    text, 
    speed = 30,
    style 
}: { 
    text: string; 
    speed?: number;
    style?: any;
}) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, speed]);

    useEffect(() => {
        // Reset when text changes
        setDisplayText('');
        setCurrentIndex(0);
    }, [text]);

    return <Text style={style}>{displayText}</Text>;
};

// ─── Essay Overlay ───────────────────────────────────────────────────────────

const ContentOverlay = ({
    thought,
    currentSpace,
    onClose,
}: {
    thought: Thought | null;
    currentSpace: Space;
    onClose: () => void;
}) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(40);

    useEffect(() => {
        if (thought) {
            opacity.value = withTiming(1, { duration: 350 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 150 });
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(30, { duration: 200 });
        }
    }, [thought]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    if (!thought) return null;

    const bg = currentSpace === 'matter' ? '#fff' : currentSpace === 'void' ? '#0a1420' : '#0a0a0a';
    const fg = currentSpace === 'matter' ? '#111' : currentSpace === 'void' ? '#6b9dc4' : '#f0f0f0';
    const fgMuted = currentSpace === 'matter' ? '#777' : currentSpace === 'void' ? '#4a6a8a' : '#555';
    const border = currentSpace === 'matter' ? '#ddd' : currentSpace === 'void' ? '#2a4a6a' : '#222';

    const renderContent = () => {
        if ((thought.kind === 'media' || thought.kind === 'artifact') && thought.media) {
            return (
                <View>
                    <Text style={[styles.essayKind, { color: fgMuted }]}>
                        {thought.media.type} · {thought.space}
                    </Text>
                    <Text style={[styles.essayTitle, { color: fg }]}>{thought.label}</Text>
                    <View style={[styles.essayRule, { backgroundColor: border }]} />

                    <MediaEmbed media={thought.media} currentSpace={currentSpace} />

                    {thought.body && (
                        <Text style={[styles.essayBody, { color: fg }]}>{thought.body}</Text>
                    )}
                </View>
            );
        }

        if (thought.kind === 'hub') {
            return (
                <View>
                    <Text style={[styles.essayKind, { color: fgMuted }]}>space · {thought.space}</Text>
                    <Text style={[styles.essayTitle, { color: fg }]}>{thought.label}</Text>
                    <View style={[styles.essayRule, { backgroundColor: border }]} />
                    {thought.body && (
                        <Text style={[styles.essayBody, { color: fg }]}>{thought.body}</Text>
                    )}
                </View>
            );
        }

        if (thought.kind === 'demo') {
            return (
                <View>
                    <Text style={[styles.essayKind, { color: fgMuted }]}>demonstration · {thought.space}</Text>
                    <Text style={[styles.essayTitle, { color: fg }]}>{thought.label}</Text>
                    <View style={[styles.essayRule, { backgroundColor: border }]} />

                    <View style={styles.demoContainer}>
                        <View style={[styles.demoPlaceholder, { borderColor: border }]}>
                            <Text style={[styles.demoPlaceholderText, { color: fgMuted }]}>
                                interactive demonstration
                            </Text>
                            <Text style={[styles.demoPlaceholderSubtext, { color: fgMuted }]}>
                                [visualization would render here]
                            </Text>
                        </View>
                        {thought.body && (
                            <Text style={[styles.essayBody, { color: fg }]}>{thought.body}</Text>
                        )}
                        {thought.game?.clue && (
                            <View style={[styles.gameClue, { borderColor: border }]}>
                                <Text style={[styles.gameClueText, { color: fgMuted }]}>
                                    puzzle: {thought.game.clue}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            );
        }

        if (thought.kind === 'riddle') {
            return (
                <View>
                    <Text style={[styles.essayKind, { color: fgMuted }]}>riddle · {thought.space}</Text>
                    <Text style={[styles.essayTitle, { color: fg }]}>{thought.label}</Text>
                    <View style={[styles.essayRule, { backgroundColor: border }]} />

                    <View style={styles.riddleContainer}>
                        {thought.body && (
                            <Text style={[styles.riddleText, { color: fg }]}>{thought.body}</Text>
                        )}
                        <View style={[styles.riddleInput, { borderColor: border }]}>
                            <TextInput
                                style={[styles.riddleInputText, { color: fg }]}
                                placeholder="your answer..."
                                placeholderTextColor={fgMuted}
                            />
                        </View>
                        <TouchableOpacity style={[styles.riddleSubmit, { borderColor: fg }]}>
                            <Text style={[styles.riddleSubmitText, { color: fg }]}>submit →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        if (thought.kind === 'collage') {
            return (
                <View>
                    <Text style={[styles.essayKind, { color: fgMuted }]}>collage · {thought.space}</Text>
                    <Text style={[styles.essayTitle, { color: fg }]}>{thought.label}</Text>
                    <View style={[styles.essayRule, { backgroundColor: border }]} />

                    {thought.body && (
                        <Text style={[styles.essayBody, { color: fg, marginBottom: 20 }]}>{thought.body}</Text>
                    )}

                    {/* Video */}
                    {thought.media?.url && (
                        <View style={styles.collageExpandedVideo}>
                            {Platform.OS === 'web' ? (
                                React.createElement('video', {
                                    src: thought.media.url,
                                    controls: true,
                                    style: { 
                                        width: '100%', 
                                        maxHeight: '400px', 
                                        objectFit: 'contain', 
                                        borderRadius: 8,
                                        backgroundColor: '#000'
                                    },
                                })
                            ) : (
                                <View style={[styles.collageExpandedVideoPlaceholder, { borderColor: border }]}>
                                    <Text style={[styles.essayBody, { color: fgMuted }]}>
                                        Video: {thought.media.title || 'Untitled'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Images */}
                    {(thought.images ?? []).length > 0 && (
                        <View style={styles.collageExpandedImages}>
                            {(thought.images ?? []).map((src, i) => (
                                Platform.OS === 'web' ? (
                                    React.createElement('img', {
                                        key: i,
                                        src,
                                        style: { 
                                            width: '100%', 
                                            maxHeight: '500px', 
                                            objectFit: 'contain', 
                                            borderRadius: 8,
                                            marginBottom: i < (thought.images!.length - 1) ? 16 : 0
                                        },
                                    })
                                ) : (
                                    <Image
                                        key={i}
                                        source={{ uri: src }}
                                        style={[
                                            styles.collageExpandedImage,
                                            { marginBottom: i < (thought.images!.length - 1) ? 16 : 0 }
                                        ]}
                                        resizeMode="contain"
                                    />
                                )
                            ))}
                        </View>
                    )}
                </View>
            );
        }

        // Default essay/fragment view
        return (
            <View>
                <Text style={[styles.essayKind, { color: fgMuted }]}>
                    {thought.kind} · {thought.space}
                </Text>
                <Text style={[styles.essayTitle, { color: fg }]}>{thought.label}</Text>
                <View style={[styles.essayRule, { backgroundColor: border }]} />
                {thought.body && (
                    thought.id === 'void-welcome' ? (
                        <TypewriterText 
                            text={thought.body} 
                            speed={25}
                            style={[styles.essayBody, { color: fg }]}
                        />
                    ) : thought.kind === 'essay' ? (
                        <MarkdownText 
                            text={thought.body}
                            style={[styles.essayBody, { color: fg }]}
                            baseColor={fg}
                        />
                    ) : (
                        <Text style={[styles.essayBody, { color: fg }]}>{thought.body}</Text>
                    )
                )}

                {/* Media embeds for any node type */}
                {thought.media && (
                    <View style={{ marginTop: 20 }}>
                        <MediaEmbed media={thought.media} currentSpace={currentSpace} />
                    </View>
                )}

                {thought.notes && thought.notes.length > 0 && (
                    <View style={[styles.essayNotesContainer, { borderColor: border }]}>
                        <Text style={[styles.essayNotesHeader, { color: fgMuted }]}>marginal notes</Text>
                        {thought.notes.map((note, i) => (
                            <Text key={i} style={[styles.essayNote, { color: fgMuted }]}>
                                — {note}
                            </Text>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <Animated.View style={[styles.essayOverlay, overlayStyle, { backgroundColor: bg, borderColor: border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Close */}
                <TouchableOpacity 
                    style={styles.essayClose} 
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Text style={[styles.essayCloseText, { color: fgMuted }]}>✕ close</Text>
                </TouchableOpacity>

                {renderContent()}
            </ScrollView>
        </Animated.View>
    );
};

// ─── Ripple Effect ─────────────────────────────────────────────────────────

const RippleEffect = ({
    visible,
    centerX,
    centerY,
    onComplete
}: {
    visible: boolean;
    centerX: number;
    centerY: number;
    onComplete: () => void;
}) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = 0;
            opacity.value = 1;
            scale.value = withTiming(3, { duration: 800, easing: Easing.out(Easing.cubic) });
            opacity.value = withTiming(0, { duration: 800 }, () => {
                onComplete();
            });
        }
    }, [visible]);

    const rippleStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        left: centerX - 50,
        top: centerY - 50,
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <>
            <Animated.View style={rippleStyle} />
            <Animated.View style={[rippleStyle, { borderWidth: 1 }]} />
        </>
    );
};

// ─── Particle Burst ────────────────────────────────────────────────────────

// Individual particle component to avoid hooks in loops
const BurstParticle = ({
    angle,
    distance,
    opacity,
    centerX,
    centerY,
    space,
}: {
    angle: number;
    distance: Animated.SharedValue<number>;
    opacity: Animated.SharedValue<number>;
    centerX: number;
    centerY: number;
    space: Space;
}) => {
    const particleStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        left: centerX + Math.cos(angle) * distance.value - 2,
        top: centerY + Math.sin(angle) * distance.value - 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: space === 'matter' ? '#111' : '#fff',
        opacity: opacity.value,
    }));

    return <Animated.View style={particleStyle} />;
};

const ParticleBurst = ({
    visible,
    centerX,
    centerY,
    space,
}: {
    visible: boolean;
    centerX: number;
    centerY: number;
    space: Space;
}) => {
    // Create all 20 shared values upfront
    const distance0 = useSharedValue(0);
    const distance1 = useSharedValue(0);
    const distance2 = useSharedValue(0);
    const distance3 = useSharedValue(0);
    const distance4 = useSharedValue(0);
    const distance5 = useSharedValue(0);
    const distance6 = useSharedValue(0);
    const distance7 = useSharedValue(0);
    const distance8 = useSharedValue(0);
    const distance9 = useSharedValue(0);
    const distance10 = useSharedValue(0);
    const distance11 = useSharedValue(0);
    const distance12 = useSharedValue(0);
    const distance13 = useSharedValue(0);
    const distance14 = useSharedValue(0);
    const distance15 = useSharedValue(0);
    const distance16 = useSharedValue(0);
    const distance17 = useSharedValue(0);
    const distance18 = useSharedValue(0);
    const distance19 = useSharedValue(0);

    const opacity0 = useSharedValue(0);
    const opacity1 = useSharedValue(0);
    const opacity2 = useSharedValue(0);
    const opacity3 = useSharedValue(0);
    const opacity4 = useSharedValue(0);
    const opacity5 = useSharedValue(0);
    const opacity6 = useSharedValue(0);
    const opacity7 = useSharedValue(0);
    const opacity8 = useSharedValue(0);
    const opacity9 = useSharedValue(0);
    const opacity10 = useSharedValue(0);
    const opacity11 = useSharedValue(0);
    const opacity12 = useSharedValue(0);
    const opacity13 = useSharedValue(0);
    const opacity14 = useSharedValue(0);
    const opacity15 = useSharedValue(0);
    const opacity16 = useSharedValue(0);
    const opacity17 = useSharedValue(0);
    const opacity18 = useSharedValue(0);
    const opacity19 = useSharedValue(0);

    const distances = [
        distance0, distance1, distance2, distance3, distance4,
        distance5, distance6, distance7, distance8, distance9,
        distance10, distance11, distance12, distance13, distance14,
        distance15, distance16, distance17, distance18, distance19
    ];

    const opacities = [
        opacity0, opacity1, opacity2, opacity3, opacity4,
        opacity5, opacity6, opacity7, opacity8, opacity9,
        opacity10, opacity11, opacity12, opacity13, opacity14,
        opacity15, opacity16, opacity17, opacity18, opacity19
    ];

    // Create particle data
    const particles = useMemo(() =>
        Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            return { id: i, angle };
        }), []
    );

    useEffect(() => {
        if (visible) {
            const maxDistance = space === 'mind' ? 150 : space === 'matter' ? 100 : space === 'void' ? 120 : 180;

            particles.forEach((p, i) => {
                distances[i].value = 0;
                opacities[i].value = 1;

                const delay = i * 20;

                distances[i].value = withDelay(
                    delay,
                    withTiming(maxDistance, {
                        duration: 800,
                        easing: Easing.out(Easing.cubic),
                    })
                );
                opacities[i].value = withDelay(
                    delay,
                    withTiming(0, { duration: 800 })
                );
            });
        }
    }, [visible, space]);

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p, i) => (
                <BurstParticle
                    key={p.id}
                    angle={p.angle}
                    distance={distances[i]}
                    opacity={opacities[i]}
                    centerX={centerX}
                    centerY={centerY}
                    space={space}
                />
            ))}
        </View>
    );
};

// ─── Space Transition Background ─────────────────────────────────────────────

const SpaceBackground = ({ currentSpace }: { currentSpace: Space }) => {
    const spaceIndex = useSharedValue(
        currentSpace === 'mind' ? 0 : currentSpace === 'matter' ? 1 : currentSpace === 'confluence' ? 2 : 3
    );

    useEffect(() => {
        spaceIndex.value = withTiming(
            currentSpace === 'mind' ? 0 : currentSpace === 'matter' ? 1 : currentSpace === 'confluence' ? 2 : 3,
            { duration: 700, easing: Easing.inOut(Easing.cubic) }
        );
    }, [currentSpace]);

    const bgStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            spaceIndex.value,
            [0, 1, 2, 3],
            ['#000000', '#f5f5f0', '#888880', '#0a1420'] // void is washed dark blue
        ),
    }));

    return <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} />;
};

// ─── Particle Background ─────────────────────────────────────────────────────

const ParticleBackground = ({
    mouseX,
    mouseY,
    currentSpace,
}: {
    mouseX: Animated.SharedValue<number>;
    mouseY: Animated.SharedValue<number>;
    currentSpace: Space;
}) => {
    const { width, height } = useWindowDimensions();
    const [particles, setParticles] = useState<Array<{ x: number; y: number; id: string }>>([]);

    // Initialize particles when dimensions are available
    useEffect(() => {
        if (width > 0 && height > 0) {
            const spacing = currentSpace === 'void' ? 35 : 30; // Slightly tighter in void for agitation
            const cols = Math.floor(width / spacing);
            const rows = Math.floor(height / spacing);
            const newParticles = Array.from({ length: cols * rows }).map((_, i) => ({
                x: (i % cols) * spacing + spacing / 2 + (currentSpace === 'void' ? Math.random() * 5 - 2.5 : 0), // Add jitter in void
                y: Math.floor(i / cols) * spacing + spacing / 2 + (currentSpace === 'void' ? Math.random() * 5 - 2.5 : 0),
                id: `particle-${i}`,
            }));
            setParticles(newParticles);
        }
    }, [width, height, currentSpace]);

    const spaceIndex = useSharedValue(
        currentSpace === 'mind' ? 0 : currentSpace === 'matter' ? 1 : currentSpace === 'confluence' ? 2 : 3
    );

    useEffect(() => {
        spaceIndex.value = withTiming(
            currentSpace === 'mind' ? 0 : currentSpace === 'matter' ? 1 : currentSpace === 'confluence' ? 2 : 3,
            { duration: 700 }
        );
    }, [currentSpace, spaceIndex]);

    const dotColor = useDerivedValue(() => {
        return interpolateColor(
            spaceIndex.value,
            [0, 1, 2, 3],
            [
                'rgba(255, 255, 255, 0.2)', // mind - white
                'rgba(0, 0, 0, 0.1)',       // matter - black
                'rgba(255, 255, 255, 0.27)', // confluence - white
                'rgba(107, 157, 196, 0.25)'  // void - washed blue, more visible
            ]
        );
    });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p) => (
                <Dot
                    key={p.id}
                    baseX={p.x}
                    baseY={p.y}
                    mouseX={mouseX}
                    mouseY={mouseY}
                    color={dotColor}
                    space={currentSpace}
                />
            ))}
        </View>
    );
};

const Dot = ({
    baseX,
    baseY,
    mouseX,
    mouseY,
    color,
    space,
}: {
    baseX: number;
    baseY: number;
    mouseX: Animated.SharedValue<number>;
    mouseY: Animated.SharedValue<number>;
    color: Animated.SharedValue<string>;
    space: Space;
}) => {
    // Add random jitter for void space to create unstable feeling
    const jitterX = useSharedValue(0);
    const jitterY = useSharedValue(0);
    
    useEffect(() => {
        if (space === 'void') {
            const interval = setInterval(() => {
                jitterX.value = withTiming(Math.random() * 4 - 2, { duration: 200 });
                jitterY.value = withTiming(Math.random() * 4 - 2, { duration: 200 });
            }, 300 + Math.random() * 200); // Random intervals for more chaos
            
            return () => clearInterval(interval);
        } else {
            jitterX.value = withTiming(0, { duration: 300 });
            jitterY.value = withTiming(0, { duration: 300 });
        }
    }, [space]);
    
    const animatedStyle = useAnimatedStyle(() => {
        const dx = mouseX.value - baseX;
        const dy = mouseY.value - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = space === 'void' ? 100 : 120; // Slightly larger interaction in void

        let scale = 1;
        let translateX = 0;
        let translateY = 0;

        if (dist < maxDist && dist > 0) {
            const factor = space === 'void' ? 12 : 10; // More aggressive movement in void
            const scaleFactor = space === 'void' ? 2.5 : 2; // More scaling in void for intensity

            scale = 1 + (1 - dist / maxDist) * scaleFactor;
            translateX = -(dx / dist) * factor * (1 - dist / maxDist);
            translateY = -(dy / dist) * factor * (1 - dist / maxDist);
        }

        return {
            position: 'absolute',
            left: baseX - 1.5,
            top: baseY - 1.5,
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: color.value,
            transform: [
                { translateX: translateX + jitterX.value },
                { translateY: translateY + jitterY.value },
                { scale },
            ],
        };
    });

    return <Animated.View style={animatedStyle} />;
};

// ─── Capture Panel ───────────────────────────────────────────────────────────

const CapturePanel = ({
    visible,
    currentSpace,
    userRole,
    onClose,
    onNodeCreated,
    onSpaceChange,
}: {
    visible: boolean;
    currentSpace: Space;
    userRole: 'admin' | 'public';
    onClose: () => void;
    onNodeCreated?: () => Promise<void>;
    onSpaceChange?: (space: Space) => void;
}) => {
    const translateY = useSharedValue(300);
    const opacity = useSharedValue(0);
    const [text, setText] = useState('');
    const [selectedKind, setSelectedKind] = useState<NodeKind>('fragment');
    const [mediaUrl, setMediaUrl] = useState('');
    const [contributorName, setContributorName] = useState('');
    const [contributionDate, setContributionDate] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFormatTooltip, setShowFormatTooltip] = useState(false);

    // Auto-set current date for public users
    useEffect(() => {
        if (visible && userRole === 'public' && !contributionDate) {
            const now = new Date();
            const formatted = now.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }).toLowerCase();
            setContributionDate(formatted);
        }
    }, [visible, userRole]);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
            opacity.value = withTiming(1, { duration: 250 });
        } else {
            translateY.value = withTiming(300, { duration: 250, easing: Easing.in(Easing.cubic) });
            opacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const panelStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const bg = currentSpace === 'matter' ? '#fff' : currentSpace === 'void' ? '#0a1420' : '#0a0a0a';
    const fg = currentSpace === 'matter' ? '#111' : currentSpace === 'void' ? '#6b9dc4' : '#f0f0ee';
    const border = currentSpace === 'matter' ? '#ddd' : currentSpace === 'void' ? '#3a5a7a' : '#222';
    const placeholder = currentSpace === 'matter' ? '#aaa' : currentSpace === 'void' ? '#4a6a8a' : '#555';

    const nodeTypes = userRole === 'public' 
        ? [
            { kind: 'fragment' as NodeKind, label: 'fragment', icon: '·' },
            { kind: 'essay' as NodeKind, label: 'essay', icon: '—' },
        ]
        : [
            { kind: 'fragment' as NodeKind, label: 'fragment', icon: '·' },
            { kind: 'essay' as NodeKind, label: 'essay', icon: '—' },
            { kind: 'collage' as NodeKind, label: 'collage', icon: '▦' },
            { kind: 'artifact' as NodeKind, label: 'project', icon: '◈' },
        ];

    const handleSave = async () => {
        if (!text.trim()) return;

        setIsCreating(true);

        try {
            const newThought = {
                id: `node_${Date.now()}`,
                kind: selectedKind,
                label: text.split('\n')[0].substring(0, 50), // First line as label
                body: text,
                space: currentSpace,
                initialX: Math.random() * 400 - 200,
                initialY: Math.random() * 400 - 200,
                media: mediaUrl ? {
                    type: mediaUrl.includes('spotify') ? 'spotify' :
                          mediaUrl.includes('youtube') || mediaUrl.includes('youtu.be') ? 'youtube' :
                          mediaUrl.includes('tiktok') ? 'tiktok' : 'iframe',
                    url: mediaUrl,
                    embedId: extractEmbedId(mediaUrl),
                    title: text.split('\n')[0]
                } : null,
                contributorName: userRole === 'public' ? (contributorName.trim() || null) : null,
                contributionDate: userRole === 'public' ? (contributionDate.trim() || null) : null
            };

            const result = await api.createThought(newThought);
            
            // Handle redirect to void space for public users
            if (result.redirected && result.actualSpace === 'void') {
                console.log('Public contribution redirected to void space');
                // Switch to void space first
                if (onSpaceChange) {
                    onSpaceChange('void');
                }
                // Then reload thoughts after a brief delay to ensure space has switched
                setTimeout(async () => {
                    await onNodeCreated?.();
                }, 100);
            } else {
                // For admin users, just reload thoughts
                await onNodeCreated?.();
            }

            setText('');
            setMediaUrl('');
            setContributorName('');
            setContributionDate('');
            setSelectedKind('fragment');
            setPreviewMode('write');
            onClose();
        } catch (error) {
            console.error('Error creating thought:', error);
            // Show user-friendly error for content moderation
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('community guidelines')) {
                if (Platform.OS === 'web') {
                    const w = global as any;
                    w.alert?.('Content was rejected due to community guidelines. Please revise and try again.');
                }
            }
        } finally {
            setIsCreating(false);
        }
    };

    const extractEmbedId = (url: string) => {
        if (url.includes('spotify.com/track/')) {
            const trackId = url.split('track/')[1].split('?')[0];
            console.log('Extracted Spotify track ID:', trackId);
            return trackId;
        }
        if (url.includes('youtube.com/watch?v=')) {
            return url.split('v=')[1].split('&')[0];
        }
        if (url.includes('youtu.be/')) {
            return url.split('youtu.be/')[1].split('?')[0];
        }
        if (url.includes('tiktok.com/') && url.includes('/video/')) {
            return url.split('/video/')[1].split('?')[0];
        }
        return '';
    };

    return (
        <Animated.View style={[
            styles.capturePanel, 
            panelStyle, 
            { 
                backgroundColor: bg, 
                borderColor: border,
                height: isExpanded ? '85%' : undefined,
                maxHeight: isExpanded ? undefined : '60%'
            }
        ]}>
            <View style={styles.captureTitleRow}>
                <Text style={[styles.captureTitle, { color: fg }]}>
                    {userRole === 'public' ? 'add to void' : `create node · ${currentSpace}`}
                    <Text style={{ opacity: 0.35, fontSize: 10 }}> / to open · esc to close</Text>
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Formatting tooltip */}
                    {(selectedKind === 'essay' || selectedKind === 'fragment') && (
                        <TouchableOpacity 
                            onPress={() => setShowFormatTooltip(!showFormatTooltip)}
                            style={[styles.captureTooltipBtn, { borderColor: border }]}
                        >
                            <Text style={[styles.captureTooltipBtnText, { color: placeholder }]}>?</Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Expand toggle */}
                    <TouchableOpacity 
                        onPress={() => setIsExpanded(!isExpanded)}
                        style={[styles.captureExpandBtn, { borderColor: border }]}
                    >
                        <Text style={[styles.captureExpandText, { color: placeholder }]}>
                            {isExpanded ? '↓' : '↑'}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Write/Preview tabs */}
                    {(selectedKind === 'essay' || selectedKind === 'fragment') && text.trim() && (
                        <View style={styles.captureTabRow}>
                            <TouchableOpacity 
                                style={[styles.captureTab, previewMode === 'write' && styles.captureTabActive]}
                                onPress={() => setPreviewMode('write')}
                            >
                                <Text style={[styles.captureTabText, { 
                                    color: previewMode === 'write' ? fg : placeholder 
                                }]}>write</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.captureTab, previewMode === 'preview' && styles.captureTabActive]}
                                onPress={() => setPreviewMode('preview')}
                            >
                                <Text style={[styles.captureTabText, { 
                                    color: previewMode === 'preview' ? fg : placeholder 
                                }]}>preview</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Node type selector */}
            <View style={styles.captureTypeRow}>
                {nodeTypes.map(type => (
                    <TouchableOpacity
                        key={type.kind}
                        style={[
                            styles.captureTypeChip,
                            {
                                borderColor: selectedKind === type.kind ? ACCENT_COLOR : border,
                                backgroundColor: selectedKind === type.kind ? ACCENT_COLOR_MUTED : 'transparent'
                            }
                        ]}
                        onPress={() => setSelectedKind(type.kind)}
                    >
                        <Text style={[
                            styles.captureTypeText,
                            { color: selectedKind === type.kind ? '#000' : fg }
                        ]}>
                            {type.icon} {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Formatting tooltip */}
            {showFormatTooltip && (selectedKind === 'essay' || selectedKind === 'fragment') && (
                <View style={[styles.captureTooltip, { borderColor: border, backgroundColor: bg }]}>
                    <Text style={[styles.captureTooltipText, { color: fg }]}>
                        # heading{'\n'}
                        ## subheading{'\n'}
                        **bold** · *italic* · `code`{'\n'}
                        — list item{'\n'}
                        &gt; quote{'\n'}
                        --- divider
                    </Text>
                </View>
            )}

            {/* Write mode */}
            {previewMode === 'write' && (
                <>
                    <TextInput
                        style={[
                            styles.captureInput, 
                            { 
                                color: fg, 
                                borderColor: border,
                                minHeight: isExpanded ? 300 : 80,
                                maxHeight: isExpanded ? 500 : 200
                            }
                        ]}
                        placeholder="your thought..."
                        placeholderTextColor={placeholder}
                        value={text}
                        onChangeText={setText}
                        multiline
                        autoFocus={visible}
                    />
                    
                    {/* Media URL input - available for all node types */}
                    <TextInput
                        style={[styles.captureMediaInput, { color: fg, borderColor: border }]}
                        placeholder="add media: paste spotify, youtube, or tiktok link (optional)"
                        placeholderTextColor={placeholder}
                        value={mediaUrl}
                        onChangeText={setMediaUrl}
                    />
                </>
            )}

            {/* Preview mode */}
            {previewMode === 'preview' && (
                <ScrollView style={[
                    styles.capturePreview, 
                    { 
                        borderColor: border,
                        minHeight: isExpanded ? 300 : 80,
                        maxHeight: isExpanded ? 500 : 200
                    }
                ]}>
                    {selectedKind === 'essay' ? (
                        <MarkdownText 
                            text={text} 
                            style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, lineHeight: 28 }}
                            baseColor={fg}
                        />
                    ) : (
                        <Text style={[styles.capturePreviewText, { color: fg }]}>{text}</Text>
                    )}
                    
                    {/* Show media embed preview if URL is provided */}
                    {mediaUrl && Platform.OS === 'web' && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.captureMediaPreviewLabel, { color: placeholder }]}>
                                media embed preview:
                            </Text>
                            {mediaUrl.includes('spotify') && extractEmbedId(mediaUrl) && (
                                React.createElement('iframe', {
                                    src: `https://open.spotify.com/embed/track/${extractEmbedId(mediaUrl)}?utm_source=generator&theme=0`,
                                    width: '100%',
                                    height: '152',
                                    frameBorder: '0',
                                    allow: 'encrypted-media',
                                    style: { borderRadius: 4, marginTop: 8 }
                                })
                            )}
                            {(mediaUrl.includes('youtube') || mediaUrl.includes('youtu.be')) && extractEmbedId(mediaUrl) && (
                                React.createElement('iframe', {
                                    src: `https://www.youtube.com/embed/${extractEmbedId(mediaUrl)}`,
                                    width: '100%',
                                    height: '315',
                                    frameBorder: '0',
                                    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                                    allowFullScreen: true,
                                    style: { borderRadius: 4, marginTop: 8 }
                                })
                            )}
                            {mediaUrl.includes('tiktok') && extractEmbedId(mediaUrl) && (
                                React.createElement('iframe', {
                                    src: `https://www.tiktok.com/embed/v2/${extractEmbedId(mediaUrl)}`,
                                    width: '100%',
                                    height: '700',
                                    frameBorder: '0',
                                    allowFullScreen: true,
                                    style: { borderRadius: 8, marginTop: 8 }
                                })
                            )}
                            {!mediaUrl.includes('spotify') && !mediaUrl.includes('youtube') && !mediaUrl.includes('youtu.be') && !mediaUrl.includes('tiktok') && (
                                <Text style={[styles.captureMediaHintText, { color: placeholder, marginTop: 8 }]}>
                                    paste a spotify, youtube, or tiktok link to see preview
                                </Text>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Name and date fields for public users */}
            {userRole === 'public' && (
                <View style={styles.captureMetaRow}>
                    <TextInput
                        style={[styles.captureMetaInput, { color: fg, borderColor: border, flex: 1 }]}
                        placeholder="sign your name (optional)"
                        placeholderTextColor={placeholder}
                        value={contributorName}
                        onChangeText={setContributorName}
                    />
                    <TextInput
                        style={[styles.captureMetaInput, { color: fg, borderColor: border, flex: 1, marginLeft: 8 }]}
                        placeholder="date"
                        placeholderTextColor={placeholder}
                        value={contributionDate}
                        onChangeText={setContributionDate}
                    />
                </View>
            )}

            <View style={styles.captureRow}>
                <TouchableOpacity
                    style={[styles.captureCancel, { borderColor: border }]}
                    onPress={onClose}
                >
                    <Text style={[styles.captureCancelText, { color: fg }]}>cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.captureSave,
                        {
                            borderColor: ACCENT_COLOR,
                            backgroundColor: text.trim() ? ACCENT_COLOR : 'transparent',
                            opacity: isCreating ? 0.5 : 1
                        }
                    ]}
                    onPress={handleSave}
                    disabled={!text.trim() || isCreating}
                >
                    <Text style={[
                        styles.captureSaveText,
                        { color: text.trim() ? '#000' : fg }
                    ]}>
                        {isCreating ? 'creating...' : userRole === 'public' ? 'add to void →' : 'create →'}
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

// ─── Filter Chip with Pulse ──────────────────────────────────────────────────────

const FilterChip = ({
    label, active, fg, onPress, animDelay,
}: { label: string; active: boolean; fg: string; onPress: () => void; animDelay: number }) => {
    const pulse = useSharedValue(0);
    useEffect(() => {
        // Brief outline pulse on mount to hint interactivity
        pulse.value = withDelay(
            animDelay,
            withSequence(
                withTiming(1, { duration: 600 }),
                withTiming(0.5, { duration: 400 }),
                withTiming(1, { duration: 400 }),
                withTiming(0, { duration: 600 }),
            )
        );
    }, []);
    const chipStyle = useAnimatedStyle(() => ({
        borderColor: active
            ? fg
            : `rgba(${fg === '#ffffff' ? '255,255,255' : '0,0,0'},${0.25 + pulse.value * 0.6})`,
        shadowColor: fg,
        shadowOpacity: pulse.value * 0.5,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
    }));
    return (
        <Animated.View style={[styles.filterChip, active && styles.filterChipActive, chipStyle]}>
            <TouchableOpacity onPress={onPress}>
                <Text style={[styles.filterChipText, { color: active ? fg : fg + '88' }]}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Mobile Currently ───────────────────────────────────────────────────────────────
// On mobile: a bottom-sheet that slides up from a thin status bar.
// On desktop: the familiar collapsible card in the corner.

const CurrentlyWidget = ({
    fg, currentSpace, isMobile, screenHeight,
}: { fg: string; currentSpace: Space; isMobile: boolean; screenHeight: number }) => {
    const [open, setOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const bg = currentSpace === 'matter' ? 'rgba(255,255,255,0.97)' : 'rgba(10,10,10,0.95)';
    const border = currentSpace === 'matter' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
    const muted = currentSpace === 'matter' ? '#999' : '#555';

    // ─ Desktop card logic
    const desktopHeight = useSharedValue(open ? 320 : 48); // Increased height
    const desktopOpacity = useSharedValue(open ? 1 : 0);
    useEffect(() => {
        if (isMobile) return;
        desktopHeight.value = withSpring(open ? 320 : 48, { damping: 20, stiffness: 140 }); // Increased height
        desktopOpacity.value = withTiming(open ? 1 : 0, { duration: 220 });
    }, [open, isMobile]);
    const desktopBodyStyle = useAnimatedStyle(() => ({ opacity: desktopOpacity.value }));
    const desktopCardStyle = useAnimatedStyle(() => ({ height: desktopHeight.value, overflow: 'hidden' }));

    // ─ Mobile sheet logic
    const SHEET_H = Math.min(screenHeight * 0.55, 400);
    const sheetY = useSharedValue(SHEET_H + 8);
    useEffect(() => {
        if (!isMobile) return;
        sheetY.value = withSpring(open ? 0 : SHEET_H + 8, { damping: 22, stiffness: 160 });
    }, [open, isMobile, SHEET_H]);
    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

    const statusBg = currentSpace === 'matter' ? 'rgba(255,255,255,0.85)' : 'rgba(18,18,18,0.88)';

    if (!isVisible) return null;

    if (isMobile) {
        return (
            <>
                {/* Thin tap-to-open status bar at bottom left */}
                <View style={[styles.mobileStatusBar, { backgroundColor: statusBg, borderColor: border, flexDirection: 'row', alignItems: 'center' }]}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() => setOpen(v => !v)}
                        activeOpacity={0.8}>
                        <Text style={{ fontSize: 12, marginRight: 6 }}>🎵</Text>
                        <Text style={[{ fontFamily: 'Space Grotesk', fontSize: 10, letterSpacing: 1, color: fg }]}>currently</Text>
                        <Text style={{ fontSize: 10, marginLeft: 6, color: muted }}>{open ? '↓' : '↑'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setIsVisible(false)} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ marginLeft: 10 }}>
                        <Text style={{ fontSize: 12, color: muted, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Full bottom sheet */}
                <Animated.View style={[
                    styles.mobileSheet,
                    sheetStyle,
                    { backgroundColor: bg, borderColor: border, height: SHEET_H }
                ]}>
                    {/* Sheet handle */}
                    <View style={styles.mobileSheetHandle}>
                        <View style={[styles.mobileSheetPill, { backgroundColor: muted }]} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
                            <Text style={[styles.currentlyTitle, { color: fg, marginBottom: 16, marginTop: 4, fontSize: 13 }]}>currently</Text>

                            <Text style={[styles.currentlyLabel, { color: muted, marginBottom: 8 }]}>🎵 on repeat</Text>
                            {Platform.OS === 'web' && (
                                <iframe
                                    style={{ borderRadius: 8, marginBottom: 16 }}
                                    src="https://open.spotify.com/embed/track/5LO3M8pfuprpwNN1p3tuxW?utm_source=generator&theme=0"
                                    width="100%" height="152" frameBorder="0"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                />
                            )}

                            <View style={[styles.mobileSheetRow, { borderColor: border }]}>
                                <Text style={{ fontSize: 18 }}>📚</Text>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.currentlyLabel, { color: muted }]}>reading</Text>
                                    <Text style={[styles.currentlyValue, { color: fg, fontSize: 14 }]}>Kafka on the Shore</Text>
                                </View>
                            </View>

                            <View style={[styles.mobileSheetRow, { borderColor: border }]}>
                                <Text style={{ fontSize: 18 }}>🎸</Text>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.currentlyLabel, { color: muted }]}>learning</Text>
                                    <Text style={[styles.currentlyValue, { color: fg, fontSize: 14 }]}>Fast Car</Text>
                                </View>
                            </View>

                            <View style={{ marginTop: 4 }}>
                                <Text style={[styles.currentlyLabel, { color: muted, marginBottom: 8 }]}>🛠 building</Text>
                                <Text style={[styles.currentlyProject, { color: fg, fontSize: 12, lineHeight: 20 }]}>— overhauling qpid tech sites</Text>
                                <Text style={[styles.currentlyProject, { color: fg, fontSize: 12, lineHeight: 20 }]}>— bookmarked beta prep</Text>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </>
        );
    }

    // Desktop version
    return (
        <Animated.View style={[
            styles.currently,
            desktopCardStyle,
            { backgroundColor: bg, borderColor: border }
        ]}>
            <TouchableOpacity style={styles.currentlyHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
                <Text style={[styles.currentlyTitle, { color: fg }]}>currently</Text>
                <Text style={[styles.currentlyToggle, { color: muted }]}>{open ? '−' : '+'}</Text>
            </TouchableOpacity>
            <Animated.View style={[desktopBodyStyle, { flex: 1 }]}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={styles.currentlySection}>
                        <Text style={[styles.currentlyLabel, { color: muted }]}>🎵 on repeat</Text>
                        {Platform.OS === 'web' && open && (
                            <iframe
                                style={{ borderRadius: 8, marginTop: 6 }}
                                src="https://open.spotify.com/embed/track/5LO3M8pfuprpwNN1p3tuxW?utm_source=generator&theme=0"
                                width="100%" height="152" frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                            />
                        )}
                    </View>
                    <View style={[styles.currentlyDivider, { backgroundColor: border }]} />
                    <View style={styles.currentlySection}>
                        <View style={styles.currentlyRow}>
                            <Text style={[styles.currentlyLabel, { color: muted }]}>📚</Text>
                            <Text style={[styles.currentlyValue, { color: fg }]}>Kafka on the Shore</Text>
                        </View>
                        <View style={styles.currentlyRow}>
                            <Text style={[styles.currentlyLabel, { color: muted }]}>🎸</Text>
                            <Text style={[styles.currentlyValue, { color: fg }]}>Fast Car</Text>
                        </View>
                    </View>
                    <View style={[styles.currentlyDivider, { backgroundColor: border }]} />
                    <View style={styles.currentlySection}>
                        <Text style={[styles.currentlyLabel, { color: muted }]}>🛠 building</Text>
                        <Text style={[styles.currentlyProject, { color: fg }]}>— overhauling qpid tech sites</Text>
                        <Text style={[styles.currentlyProject, { color: fg }]}>— bookmarked beta prep</Text>
                    </View>
                </ScrollView>
            </Animated.View>
        </Animated.View>
    );
};


// ─── Main App ─────────────────────────────────────────────────────────────────



// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
    const { width, height } = useWindowDimensions();
    const [currentSpace, setCurrentSpace] = useState<Space>('mind');
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['e1']));
    const [nodeSizes, setNodeSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
    const [expandedThought, setExpandedThought] = useState<Thought | null>(null);
    const [captureOpen, setCaptureOpen] = useState(false);
    const [discoveredNodes, setDiscoveredNodes] = useState<Set<string>>(new Set());
    const [voidUnlocked, setVoidUnlocked] = useState(false);
    const [rippleVisible, setRippleVisible] = useState(false);
    const [rippleCenter, setRippleCenter] = useState({ x: 0, y: 0 });
    const [burstVisible, setBurstVisible] = useState(false);
    const [burstSpace, setBurstSpace] = useState<Space>('mind');
    const [initialLoad, setInitialLoad] = useState(true);
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState<'admin' | 'public'>('public');
    const [showLogin, setShowLogin] = useState(false);
    
    const fabRotate = useSharedValue(0);

    const mouseX = useSharedValue(-1000);
    const mouseY = useSharedValue(-1000);

    const cx = width / 2;
    const cy = height / 2;

    const isMobile = width < 600;

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authStatus = await api.checkAuth();
                setIsAuthenticated(authStatus.authenticated);
                setUserRole(authStatus.role === 'admin' ? 'admin' : 'public');
                
                // Unlock void for public users so they can see their contributions
                if (authStatus.role !== 'admin') {
                    setVoidUnlocked(true);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsAuthenticated(false);
                setUserRole('public');
                // Unlock void for public users
                setVoidUnlocked(true);
            }
        };
        checkAuth();
    }, []);

    // Check if there are any thoughts in void space
    const hasVoidThoughts = thoughts.some(t => t.space === 'void');

    // Load thoughts from backend
    const loadThoughts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getThoughts();
            setThoughts(data);
            
            // Auto-unlock void if there are thoughts in it
            if (data.some((t: Thought) => t.space === 'void')) {
                setVoidUnlocked(true);
            }
        } catch (error) {
            console.error('Error loading thoughts:', error);
            // Fallback to static data if backend is not available
            setThoughts(THOUGHTS);
        } finally {
            setLoading(false);
        }
    }, []);

    // Authentication handlers
    const handleLogin = (sessionId: string) => {
        setIsAuthenticated(true);
        setUserRole('admin');
        setShowLogin(false);
        loadThoughts(); // Reload to get admin thoughts
    };

    const handleLogout = async () => {
        try {
            await api.logout();
            setIsAuthenticated(false);
            setUserRole('public');
            loadThoughts(); // Reload to get public thoughts
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Load thoughts on mount and space change
    useEffect(() => {
        loadThoughts();
    }, [loadThoughts]);

    const recenterNodes = useCallback(() => {
        setRippleCenter({ x: width / 2, y: height / 2 });
        setRippleVisible(true);
        // Increment trigger — FloatingNodes spring-animate back to initialX/Y
        setRecenterTrigger(k => k + 1);
    }, [width, height]);

    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [devMode, setDevMode] = useState(false);

    const fg = SPACE_FG[currentSpace];
    const bg = SPACE_BG[currentSpace];
    const border = currentSpace === 'matter' ? '#ddd' : '#222';
    const fgMuted = currentSpace === 'matter' ? '#777' : currentSpace === 'void' ? '#444' : '#555';

    // Initial entering animation on page load
    useEffect(() => {
        if (initialLoad && width > 0 && height > 0) {
            setRippleCenter({ x: width / 2, y: height / 2 });
            setRippleVisible(true);
            setBurstSpace('mind');
            setBurstVisible(true);

            setTimeout(() => {
                setInitialLoad(false);
                setBurstVisible(false);
            }, 1000);
        }
    }, [width, height, initialLoad]);

    // "/" key → toggle quick note  |  Escape → close panels
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handler = (e: any) => {
            const tag = (e.target as any)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key === '/') {
                e.preventDefault();
                toggleCapture();
            }
            if (e.key === 'Escape') {
                if (captureOpen) { setCaptureOpen(false); fabRotate.value = withSpring(0); }
                if (expandedThought) setExpandedThought(null);
            }
        };
        const w = global as any;
        w.addEventListener?.('keydown', handler);
        return () => w.removeEventListener?.('keydown', handler);
    }, [captureOpen, expandedThought]);

    const [activeFilter, setActiveFilter] = useState<NodeKind | 'all'>('all');

    // Filter: only show nodes belonging to current space (or all spaces for confluence)
    // Plus kind filter chip
    const visibleThoughts = thoughts.filter(t => {
        if (t.space === 'void' && !voidUnlocked) return false;
        if (t.hidden && !discoveredNodes.has(t.id)) return false;
        // Space filter — each space only shows its own nodes
        if (t.space !== currentSpace) return false;
        // Kind filter
        if (activeFilter !== 'all' && t.kind !== activeFilter) return false;
        return true;
    });

    // Compute which kinds exist in current space for filter chips
    const kindsInSpace = useMemo(() => {
        const s = new Set<NodeKind>();
        thoughts.forEach(t => {
            if (t.space === 'void' && !voidUnlocked) return;
            if (t.hidden && !discoveredNodes.has(t.id)) return;
            if (currentSpace !== 'confluence' && t.space !== currentSpace) return;
            s.add(t.kind);
        });
        return Array.from(s);
    }, [currentSpace, voidUnlocked, discoveredNodes]);

    // Reset filter when space changes
    useEffect(() => { setActiveFilter('all'); }, [currentSpace]);

    const togglePin = useCallback((id: string) => {
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const updateNodeSize = useCallback((id: string, size: { width: number; height: number }) => {
        setNodeSizes(prev => {
            const next = new Map(prev);
            next.set(id, size);
            return next;
        });
    }, []);

    const toggleCapture = () => {
        const next = !captureOpen;
        setCaptureOpen(next);
        fabRotate.value = withSpring(next ? 45 : 0, { damping: 14, stiffness: 180 });
    };

    const fabStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${fabRotate.value}deg` }],
    }));

    // Enhanced space switching with animations
    const switchSpace = (space: Space) => {
        if (space === currentSpace) return;

        // Trigger ripple and particle burst effects from center
        setRippleCenter({ x: width / 2, y: height / 2 });
        setRippleVisible(true);
        setBurstSpace(space);
        setBurstVisible(true);

        // Delay space change for visual effect
        setTimeout(() => {
            setCurrentSpace(space);
            setBurstVisible(false);
        }, 300);

        // Unlock void if riddle is solved
        if (space === 'void' || discoveredNodes.has('void1')) {
            setVoidUnlocked(true);
        }
    };

    // Space label style
    const spaceTabStyle = (space: Space) => ({
        color: currentSpace === space ? fg : fg + '44',
        fontWeight: currentSpace === space ? ('700' as const) : ('400' as const),
        borderBottomWidth: currentSpace === space ? 1.5 : 0,
        borderBottomColor: fg,
    });

    const onPointerMove = (e: any) => {
        mouseX.value = e.nativeEvent.offsetX ?? e.nativeEvent.pageX;
        mouseY.value = e.nativeEvent.offsetY ?? e.nativeEvent.pageY;
    };

    // Secret void access - triple click on wordmark (disabled - only show when has content)
    const [clickCount, setClickCount] = useState(0);
    const handleWordmarkPress = () => {
        // Removed triple-click unlock - void only shows when it has content
        setClickCount(prev => prev + 1);
        setTimeout(() => setClickCount(0), 1000);
    };

    return (
        <GestureHandlerRootView style={styles.root}>
            <View
                style={StyleSheet.absoluteFill}
                {...({ onPointerMove } as any)}
            >
                {/* Animated background */}
                <SpaceBackground currentSpace={currentSpace} />

                {/* Particle Background */}
                <ParticleBackground
                    mouseX={mouseX}
                    mouseY={mouseY}
                    currentSpace={currentSpace}
                />

                {/* Ripple Effect */}
                <RippleEffect
                    visible={rippleVisible}
                    centerX={rippleCenter.x}
                    centerY={rippleCenter.y}
                    onComplete={() => setRippleVisible(false)}
                />

                {/* Particle Burst */}
                <ParticleBurst
                    visible={burstVisible}
                    centerX={rippleCenter.x}
                    centerY={rippleCenter.y}
                    space={burstSpace}
                />

                {/* Nav */}
                <View style={[styles.nav, isMobile && { flexWrap: 'wrap', gap: 12, justifyContent: 'center' }]}>
                    <TouchableOpacity onPress={handleWordmarkPress} style={isMobile ? { width: '100%', alignItems: 'center', marginBottom: 4 } : {}}>
                        <Text style={styles.navWordmark}>0chiel</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.navCenter, isMobile && { flex: 0, width: '100%', marginBottom: 4 }]}>
                        <View style={[styles.navSpaces, isMobile && { gap: 16 }]}>
                            {(['mind', 'matter', 'confluence'] as Space[]).map(s => (
                                <TouchableOpacity key={s} onPress={() => switchSpace(s)}>
                                    <Text style={[styles.navSpace, spaceTabStyle(s), isMobile && { fontSize: 11 }]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                            {hasVoidThoughts && (
                                <TouchableOpacity onPress={() => switchSpace('void')}>
                                    <Text style={[styles.navSpace, spaceTabStyle('void'), isMobile && { fontSize: 11 }]}>void</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    
                    <View style={[styles.navRight, isMobile && { width: '100%', alignItems: 'center', minWidth: 'auto' }]}>
                        {isAuthenticated ? (
                            <TouchableOpacity onPress={handleLogout} style={[styles.authButton, isMobile && { backgroundColor: fg + '11', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 16 }]}>
                                <Text style={[styles.authButtonText, { color: fg }]}>
                                    admin • logout
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setShowLogin(true)} style={[styles.authButton, isMobile && { backgroundColor: fg + '11', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 16 }]}>
                                <Text style={[styles.authButtonText, { color: fg + '88' }]}>
                                    {userRole === 'public' ? 'public • login' : 'login'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Space label + filter chips */}
                <View style={styles.spaceLabel}>
                    <Text style={[styles.spaceLabelText, { color: fg + '40' }]}>
                        {currentSpace === 'mind'
                            ? 'thought fragments · essays · ideas'
                            : currentSpace === 'matter'
                                ? 'projects · artifacts · objects'
                                : currentSpace === 'confluence'
                                    ? 'mind × matter · convergence'
                                    : 'hidden layer · whispers · traces'}
                        {userRole === 'public' && ' · your contributions go to void'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
                        <FilterChip label="all" active={activeFilter === 'all'} fg={fg} animDelay={0} onPress={() => setActiveFilter('all')} />
                        {kindsInSpace.map((k, i) => (
                            <FilterChip
                                key={k}
                                label={k}
                                active={activeFilter === k}
                                fg={fg}
                                animDelay={(i + 1) * 80}
                                onPress={() => setActiveFilter(activeFilter === k ? 'all' : k)}
                            />
                        ))}
                        {/* Dev mode chip — special accent */}
                        <TouchableOpacity
                            onPress={() => setDevMode(true)}
                            style={[
                                styles.filterChip, 
                                styles.devChip,
                                currentSpace === 'matter' && styles.devChipMatter
                            ]}>
                            <Text style={[
                                styles.devChipText,
                                currentSpace === 'matter' && styles.devChipTextMatter
                            ]}>✱ how this works</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Floating nodes */}
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    {visibleThoughts.map(t => (
                        <FloatingNode
                            key={t.id}
                            thought={t}
                            currentSpace={currentSpace}
                            cx={cx}
                            cy={cy}
                            isPinned={pinnedIds.has(t.id)}
                            onPin={togglePin}
                            onResize={updateNodeSize}
                            nodeSize={nodeSizes.get(t.id)}
                            onExpand={setExpandedThought}
                            recenterTrigger={recenterTrigger}
                        />
                    ))}
                </View>

                {/* Content overlay */}
                {expandedThought && (
                    <ContentOverlay
                        thought={expandedThought}
                        currentSpace={currentSpace}
                        onClose={() => setExpandedThought(null)}
                    />
                )}

                {/* Capture panel */}
                <CapturePanel
                    visible={captureOpen}
                    currentSpace={currentSpace}
                    userRole={userRole}
                    onClose={() => {
                        setCaptureOpen(false);
                        fabRotate.value = withSpring(0);
                    }}
                    onNodeCreated={loadThoughts}
                    onSpaceChange={setCurrentSpace}
                />

                {/* FAB */}
                {!expandedThought && (
                    <TouchableOpacity style={[styles.fab, { borderColor: fg }]} onPress={toggleCapture}>
                        <Animated.Text style={[styles.fabText, { color: fg }, fabStyle]}>+</Animated.Text>
                    </TouchableOpacity>
                )}

                {/* Recenter button — center-bottom */}
                {!expandedThought && (
                    <TouchableOpacity
                        style={[styles.recenterBtn, { borderColor: fg + '55' }]}
                        onPress={recenterNodes}>
                        <Text style={[styles.recenterText, { color: fg + '99' }]}>◎</Text>
                    </TouchableOpacity>
                )}

                {/* Currently Widget */}
                <CurrentlyWidget fg={fg} currentSpace={currentSpace} isMobile={isMobile} screenHeight={height} />

                {/* Admin Login */}
                {showLogin && (
                    <AdminLogin
                        onLogin={handleLogin}
                        onClose={() => setShowLogin(false)}
                        currentSpace={currentSpace}
                    />
                )}

                {/* Dev Mode Overlay */}
                {devMode && <DevModeOverlay onClose={() => setDevMode(false)} screenW={width} screenH={height} />}

                {/* Navigation helper */}
                <View style={[styles.navHelper, { backgroundColor: bg + 'f0', borderColor: border }]}>
                    <Text style={[styles.navHelperTitle, { color: fg }]}>explore</Text>
                    <Text style={[styles.navHelperText, { color: fgMuted }]}>
                        {visibleThoughts.length} nodes in {currentSpace}
                    </Text>
                    <Text style={[styles.navHelperText, { color: fgMuted }]}>
                        {pinnedIds.size > 0 && `${pinnedIds.size} pinned`}
                    </Text>
                </View>

                {/* Void hint */}
                {currentSpace === 'void' && (
                    <View style={styles.voidHint}>
                        <Text style={[styles.voidHintText, { color: fg + '40' }]}>
                            you have found the hidden layer
                        </Text>
                    </View>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        overflow: 'hidden',
    },

    // Nav
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingTop: Platform.OS === 'web' ? 24 : 56,
        paddingBottom: 12,
        zIndex: 20,
    },
    navWordmark: {
        fontFamily: 'Space Grotesk',
        fontSize: 16,
        letterSpacing: 1,
        color: '#fff',
        opacity: 0.9,
    },
    navCenter: {
        flex: 1,
        alignItems: 'center',
    },
    navSpaces: {
        flexDirection: 'row',
        gap: 28,
    },
    navSpace: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        letterSpacing: 1.5,
        textTransform: 'lowercase',
        paddingBottom: 2,
    },
    navRight: {
        minWidth: 100,
        alignItems: 'flex-end',
    },
    authButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    authButtonText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'lowercase',
    },

    // Space sub-label
    spaceLabel: {
        paddingHorizontal: 28,
        zIndex: 19,
    },
    spaceLabelText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 1,
    },

    // Node
    node: {
        position: 'absolute',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    nodeKind: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        letterSpacing: 1.2,
        marginBottom: 4,
        textTransform: 'lowercase',
    },
    nodeLabel: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        lineHeight: 18,
        textTransform: 'lowercase',
    },
    nodeLabelEssay: {
        fontFamily: 'Cormorant Garamond',
        fontSize: 16,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    nodeLabelMarginal: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    nodeLabelHub: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
    },
    nodeHub: {
        borderRadius: 8,
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    nodeHubSub: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 0.8,
        opacity: 0.55,
        marginTop: 4,
        fontStyle: 'italic',
    },
    nodeBody: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 6,
        flexWrap: 'wrap',
    },
    pinButton: {
        alignSelf: 'flex-end',
        marginTop: 6,
    },
    pinText: {
        fontSize: 14,
        fontFamily: 'Space Grotesk',
    },

    // Node controls (pin and resize)
    nodeControlPin: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: Platform.OS === 'web' ? 20 : 24,
        height: Platform.OS === 'web' ? 20 : 24,
        borderRadius: Platform.OS === 'web' ? 10 : 12,
        borderWidth: 0.5,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    nodeControlResize: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: Platform.OS === 'web' ? 20 : 24,
        height: Platform.OS === 'web' ? 20 : 24,
        borderRadius: Platform.OS === 'web' ? 10 : 12,
        borderWidth: 0.5,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    nodeControlText: {
        fontSize: Platform.OS === 'web' ? 10 : 12,
        fontFamily: 'Space Grotesk',
        fontWeight: '400' as const,
    },

    // Node media preview
    nodeMediaPreview: {
        marginTop: 8,
        width: '100%',
    },
    nodeMediaEmbed: {
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 4,
    },
    nodeMediaHint: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 0.5,
        marginTop: 4,
        fontStyle: 'italic',
    },
    nodeMediaDescription: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        lineHeight: 14,
        marginTop: 4,
    },

    // Essay overlay
    essayOverlay: {
        position: 'absolute',
        top: 80,
        left: 24,
        right: 24,
        bottom: 100,
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 40,
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 20,
    },
    essayClose: {
        alignSelf: 'flex-end',
        marginBottom: 20,
        padding: 8,
        zIndex: 10,
    },
    essayCloseText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        letterSpacing: 1,
    },
    essayKind: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 2,
        marginBottom: 8,
    },
    essayTitle: {
        fontFamily: 'Cormorant Garamond',
        fontSize: 28,
        lineHeight: 36,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    essayRule: {
        height: 1,
        marginBottom: 20,
        opacity: 0.4,
    },
    essayBody: {
        fontFamily: 'Cormorant Garamond',
        fontSize: 19,
        lineHeight: 30,
        marginBottom: 32,
    },
    essayNotesContainer: {
        borderLeftWidth: 1,
        paddingLeft: 16,
        marginTop: 8,
    },
    essayNotesHeader: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    essayNote: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 4,
        fontStyle: 'italic',
    },

    // Capture panel
    capturePanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
        zIndex: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
    },
    captureTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    captureTitle: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 2,
    },
    captureTooltipBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureTooltipBtnText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        fontWeight: '600',
    },
    captureTooltip: {
        borderWidth: 1,
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
    },
    captureTooltipText: {
        fontFamily: 'Courier',
        fontSize: 11,
        lineHeight: 18,
    },
    captureExpandBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureExpandText: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        lineHeight: 16,
    },
    captureTabRow: {
        flexDirection: 'row',
        gap: 4,
    },
    captureTab: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    captureTabActive: {
        backgroundColor: 'rgba(244, 228, 166, 0.15)',
    },
    captureTabText: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 1,
    },
    captureInput: {
        fontFamily: 'Cormorant Garamond',
        fontSize: 20,
        lineHeight: 28,
        minHeight: 80,
        maxHeight: 200,
        borderBottomWidth: 1,
        paddingBottom: 12,
        marginBottom: 16,
    },
    capturePreview: {
        minHeight: 80,
        maxHeight: 200,
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        marginBottom: 16,
    },
    capturePreviewText: {
        fontFamily: 'Cormorant Garamond',
        fontSize: 18,
        lineHeight: 26,
    },
    captureMediaPreviewLabel: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'lowercase',
    },
    captureTypeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    captureTypeChip: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    captureTypeText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 0.5,
    },
    captureMediaInput: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
        marginBottom: 8,
    },
    captureMediaHint: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
        marginBottom: 12,
        backgroundColor: 'rgba(244, 228, 166, 0.05)',
    },
    captureMediaHintText: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        textAlign: 'center',
        fontStyle: 'italic',
        letterSpacing: 0.5,
    },
    captureMetaRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    captureMetaInput: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
    },
    captureVoidHint: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        marginBottom: 12,
    },
    captureVoidHintText: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    captureRestriction: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        marginBottom: 12,
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
    },
    captureRestrictionText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    captureCancel: {
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    captureCancelText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    captureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    captureTag: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 3,
    },
    captureTagText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
    },
    captureSave: {
        marginLeft: 'auto',
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 3,
    },
    captureSaveText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        letterSpacing: 1,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 36,
        right: 32,
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
        backgroundColor: 'transparent',
    },
    fabText: {
        fontSize: 26,
        lineHeight: 30,
        fontFamily: 'Space Grotesk',
    },

    // Filter chips
    filterRow: {
        marginTop: 8,
    },
    filterRowContent: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 4,
    },
    filterChip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    filterChipActive: {
        backgroundColor: 'rgba(128,128,128,0.15)',
    },
    filterChipText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'lowercase',
    },

    // Currently widget
    currently: {
        position: 'absolute',
        bottom: 36,
        left: 32,
        width: 320, // Increased from 260 to accommodate Spotify embed
        borderRadius: 12,
        borderWidth: 1,
        zIndex: 30,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    currentlyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    currentlyTitle: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'lowercase',
    },
    currentlyToggle: {
        fontFamily: 'Space Grotesk',
        fontSize: 16,
        lineHeight: 18,
    },
    currentlySection: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    currentlyDivider: {
        height: 1,
        marginVertical: 6,
        marginHorizontal: 16,
    },
    currentlyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    currentlyLabel: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    currentlyValue: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        fontWeight: '500' as const,
    },
    currentlyProject: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        lineHeight: 18,
        marginTop: 3,
        fontStyle: 'italic',
    },

    // Collage node
    collageGrid: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 3,
        height: 140,
    },
    collageVideo: {
        flex: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    collageImages: {
        flex: 1,
        flexDirection: 'column',
    },
    collageMobile: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 3,
        height: 120,
    },
    collageVideoMobile: {
        flex: 2,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    collageImagesMobile: {
        flex: 1,
        flexDirection: 'column',
        gap: 2,
    },
    collageImageMobile: {
        width: '100%',
        borderRadius: 3,
    },

    // Collage expanded view
    collageExpandedVideo: {
        marginBottom: 20,
    },
    collageExpandedVideoPlaceholder: {
        padding: 20,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
    },
    collageExpandedImages: {
        marginTop: 20,
    },
    collageExpandedImage: {
        width: '100%',
        height: 300,
        borderRadius: 8,
    },

    // Recenter button
    recenterBtn: {
        position: 'absolute',
        bottom: 36,
        alignSelf: 'center',
        left: '50%' as any,
        marginLeft: -20,
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
        backgroundColor: 'transparent',
    },
    recenterText: {
        fontSize: 20,
        lineHeight: 24,
    },

    // Pinned strip
    pinnedStrip: {
        position: 'absolute',
        bottom: 36,
        left: 320,
        zIndex: 30,
    },
    pinnedStripText: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 1.5,
    },

    // Navigation helper
    navHelper: {
        position: 'absolute',
        top: 80,
        right: 20,
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        minWidth: 120,
    },
    navHelperTitle: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        fontWeight: '600' as const,
        letterSpacing: 1,
        marginBottom: 4,
    },
    navHelperText: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        letterSpacing: 0.5,
        lineHeight: 14,
    },

    // Media embeds
    mediaEmbedWrapper: {
        marginVertical: 16,
    },
    mediaTitle: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 1.5,
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    mediaDescription: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 0.5,
        marginTop: 12,
        fontStyle: 'italic',
    },
    iframeContainer: {
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    embedContainer: {
        padding: 20,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    embedPlaceholder: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        textAlign: 'center',
        padding: 20,
    },

    // Demo styles
    demoContainer: {
        marginVertical: 16,
    },
    demoPlaceholder: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 6,
        padding: 40,
        marginBottom: 16,
        alignItems: 'center',
    },
    demoPlaceholderText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 8,
    },
    demoPlaceholderSubtext: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 0.5,
        fontStyle: 'italic',
    },
    gameClue: {
        borderLeftWidth: 2,
        paddingLeft: 16,
        marginTop: 16,
    },
    gameClueText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        fontStyle: 'italic',
    },

    // Riddle styles
    riddleContainer: {
        marginVertical: 16,
    },
    riddleText: {
        fontFamily: 'Cormorant Garamond',
        fontSize: 20,
        lineHeight: 30,
        textAlign: 'center',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    riddleInput: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 16,
        marginBottom: 16,
        maxWidth: 300,
        alignSelf: 'center',
    },
    riddleInputText: {
        fontFamily: 'Space Grotesk',
        fontSize: 16,
        textAlign: 'center',
    },
    riddleSubmit: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        alignItems: 'center',
        maxWidth: 200,
        alignSelf: 'center',
    },
    riddleSubmitText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        letterSpacing: 1,
    },

    // Capture tag content
    captureTagContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    // Void styles
    voidHint: {
        position: 'absolute',
        bottom: 100,
        left: 32,
        right: 32,
        zIndex: 30,
    },
    voidHintText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 2,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Collage node style
    nodeCollage: {
        borderStyle: 'solid',
    },

    // Dev chip (accent color in the chip row)
    devChip: {
        backgroundColor: 'rgba(244,228,166,0.12)', // Gold instead of purple
        borderColor: 'rgba(244,228,166,0.45)', // Gold border
        borderWidth: 1,
    },
    devChipText: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        letterSpacing: 1,
        color: '#f4e4a6', // Gold text
        textTransform: 'lowercase',
    },
    devChipMatter: {
        backgroundColor: 'rgba(244,228,166,0.25)', // Darker gold for matter
        borderColor: 'rgba(244,228,166,0.7)', // Stronger border
    },
    devChipTextMatter: {
        color: '#d4c486', // Darker gold text for matter
    },

    // Dev mode overlay
    devOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    devCard: {
        width: '100%',
        maxWidth: 520,
        backgroundColor: '#0f0f14',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#7c3aed',
        padding: 28,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 30,
    },
    devCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    devBadge: {
        backgroundColor: 'rgba(124,58,237,0.2)',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#7c3aed',
        marginRight: 'auto',
    },
    devBadgeText: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        letterSpacing: 1.5,
        color: '#a78bfa',
        textTransform: 'uppercase',
    },
    devStep: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        color: '#555',
        marginRight: 16,
    },
    devClose: {
        fontFamily: 'Space Grotesk',
        fontSize: 20,
        color: '#555',
        lineHeight: 24,
    },
    devProgressBg: {
        height: 2,
        backgroundColor: '#1a1a1a',
        borderRadius: 1,
        marginBottom: 24,
        overflow: 'hidden',
    },
    devProgressFill: {
        height: 2,
        backgroundColor: '#7c3aed',
        borderRadius: 1,
    },
    devTitle: {
        fontFamily: 'Space Grotesk',
        fontSize: 22,
        fontWeight: '700' as const,
        color: '#f0f0f0',
        marginBottom: 8,
    },
    devCode: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        color: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    devBody: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        lineHeight: 22,
        color: '#aaa',
        marginBottom: 20,
    },
    devHighlightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 12,
        borderRadius: 6,
        borderLeftWidth: 2,
        borderLeftColor: '#7c3aed',
        marginBottom: 24,
    },
    devArrow: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        color: '#7c3aed',
        marginRight: 8,
    },
    devHighlight: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        color: '#666',
        fontStyle: 'italic',
        flex: 1,
    },
    devNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    devNavBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#222',
        alignItems: 'center',
    },
    devNavBtnPrimary: {
        backgroundColor: '#a78bfa',
        borderColor: '#a78bfa',
    },
    devNavText: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        letterSpacing: 0.5,
        color: '#888',
    },

    // Mobile currently: status bar pill
    mobileStatusBar: {
        position: 'absolute',
        bottom: 36,
        left: 32,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
        zIndex: 30,
        backdropFilter: 'blur(8px)',
    } as any,

    // Mobile currently: bottom sheet
    mobileSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        zIndex: 100,
        overflow: 'hidden',
    },
    mobileSheetHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    mobileSheetPill: {
        width: 36,
        height: 4,
        borderRadius: 2,
        opacity: 0.3,
    },
    mobileSheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: 2,
    },
});
