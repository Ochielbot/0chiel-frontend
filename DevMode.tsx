/**
 * DevMode.tsx — immersive site explainer
 *
 * - SVG spotlight that animates over real UI elements
 * - ray.so-style syntax highlighting with glow animations
 * - Live node-physics playground (draggable nodes + live code)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, TextInput,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, withDecay, cancelAnimation, withDelay, withSequence, runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

// ─── Types ────────────────────────────────────────────────────────────────────

type TokType = 'kw' | 'str' | 'cmt' | 'num' | 'typ' | 'fn' | 'op' | 'plain';

interface DevStep {
    id: string;
    title: string;
    sub: string;
    body: string;
    code: string;
    isPlayground?: boolean;
    hotLines: number[];
}

// ─── Step Data ────────────────────────────────────────────────────────────────

const STEPS: DevStep[] = [
    {
        id: 'dots',
        title: '⚇ living grid',
        sub: 'ParticleBackground',
        body: 'Every dot is a canvas particle that responds to your cursor. Move your mouse around the playground below to see particles get pushed away within 80px radius. No re-renders, pure JS-thread math with Reanimated shared values.',
        code: `particles.forEach(p => {
  const dx = mouseX.value - p.x;
  const dy = mouseY.value - p.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 80) {
    // repel proportional to closeness
    p.vx -= (dx / dist) * 2.5;
    p.vy -= (dy / dist) * 2.5;
  }

  // integrate + friction
  p.x += p.vx * 0.92;
  p.y += p.vy * 0.92;
  p.vx *= 0.95;
});`,
        isPlayground: true,
        hotLines: [5, 6, 7, 8, 12, 13],
    },
    {
        id: 'chips',
        title: '◯ filter chips',
        sub: 'withDelay + withSequence',
        body: 'Watch the staggered pulse animation below. Each chip schedules a pulse via withDelay(n×80ms). The sequence creates a ripple effect across the row — all driven by shared values.',
        code: `pulse.value = withDelay(
  animDelay, // n × 80ms stagger
  withSequence(
    withTiming(1,   { duration: 600 }),
    withTiming(0.5, { duration: 400 }),
    withTiming(1,   { duration: 400 }),
    withTiming(0,   { duration: 600 }),
  )
);

const chipStyle = useAnimatedStyle(() => ({
  borderColor: \`rgba(255,255,255,\${
    0.25 + pulse.value * 0.6
  })\`,
  shadowOpacity: pulse.value * 0.5,
}));`,
        isPlayground: true,
        hotLines: [2, 3, 4, 5, 6, 7, 11, 12, 13],
    },
    {
        id: 'spaces',
        title: '△ space switching',
        sub: 'ripple + particle burst',
        body: 'Click the space buttons below to see the transition effects. Switching fires a ripple + particle burst immediately, then delays the content change by 300ms for smooth visual flow.',
        code: `const switchSpace = (space: Space) => {
  // visual effects fire instantly
  setRippleCenter({ x: width/2, y: height/2 });
  setRippleVisible(true);
  setBurstVisible(true);

  // content change is delayed 300ms
  setTimeout(() => {
    setCurrentSpace(space);
    setBurstVisible(false);
  }, 300);
};`,
        isPlayground: true,
        hotLines: [2, 3, 4, 5, 8, 9, 10, 11],
    },
    {
        id: 'media',
        title: 'rich media embeds',
        sub: 'Spotify + YouTube + TikTok',
        body: 'Paste media URLs below to see live embed previews. The system extracts embed IDs and renders native iframes just like in the real capture panel.',
        code: `const extractEmbedId = (url: string) => {
  if (url.includes('spotify.com/track/')) {
    return url.split('track/')[1].split('?')[0];
  }
  if (url.includes('youtube.com/watch?v=')) {
    return url.split('v=')[1].split('&')[0];
  }
  if (url.includes('tiktok.com/') && url.includes('/video/')) {
    return url.split('/video/')[1].split('?')[0];
  }
  return '';
};

// Render Spotify embed
<iframe
  src={\`https://open.spotify.com/embed/track/\${embedId}\`}
  width="100%" height="152" frameBorder="0"
  allow="encrypted-media" />`,
        isPlayground: true,
        hotLines: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18],
    },
    {
        id: 'nodes',
        title: '□ node physics',
        sub: 'Gesture.Pan + withDecay',
        body: 'Drag the nodes below to feel the physics. Gesture.Pan() fires onChange on the JS thread with delta values — we add directly to shared values (no setState). onFinalize captures fling velocity for momentum.',
        code: `const panGesture = Gesture.Pan()
  .onBegin(() => {
    cancelAnimation(x);
    scale.value = withSpring(1.15);
  })
  .onChange((e) => {
    x.value += e.changeX;
    y.value += e.changeY;
  })
  .onFinalize((e) => {
    scale.value = withSpring(1);
    x.value = withDecay({
      velocity: e.velocityX,
    });
    y.value = withDecay({
      velocity: e.velocityY,
    });
  });`,
        isPlayground: true,
        hotLines: [6, 7, 8, 11, 12, 13, 14, 15],
    },
    {
        id: 'recenter',
        title: '◎ spring recenter',
        sub: 'recenterTrigger + withSpring',
        body: 'Drag the nodes around, then press the recenter button. Each node watches a trigger counter — when it changes, shared X/Y values spring back to initialX/Y with physics.',
        code: `// in each FloatingNode:
useEffect(() => {
  if (recenterTrigger === 0) return;
  cancelAnimation(x);
  cancelAnimation(y);

  x.value = withSpring(thought.initialX, {
    damping: 14,
    stiffness: 90,
    mass: 1.2, // adds weight feel
  });
  y.value = withSpring(thought.initialY, {
    damping: 14,
    stiffness: 90,
  });
}, [recenterTrigger]);`,
        isPlayground: true,
        hotLines: [6, 7, 8, 9, 10, 11, 12],
    },
    {
        id: 'capture',
        title: '/ quick capture',
        sub: 'keydown + slide animation',
        body: 'Press "/" in the playground below to see the capture panel slide in. A global keydown listener catches "/" and animates the panel with spring physics. Try typing in the input to see the guard logic.',
        code: `useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const tag = e.target?.tagName;
    // guard: don't steal typing
    if (tag === 'INPUT') return;

    if (e.key === '/') {
      e.preventDefault();
      toggleCapture(); // opens OR closes
    }
  };

  window.addEventListener('keydown', handler);
  return () =>
    window.removeEventListener('keydown', handler);
}, [captureOpen]);`,
        isPlayground: true,
        hotLines: [6, 7, 8, 11, 12],
    },
];

// ─── Tokenizer ────────────────────────────────────────────────────────────────

const KW = new Set([
    'const','let','var','function','return','if','else','import','export',
    'from','type','interface','extends','async','await','new','class','for',
    'of','in','while','true','false','null','undefined','void','typeof',
    'useEffect','useState','useRef','useCallback','useMemo',
]);

const COLORS: Record<TokType, string> = {
    kw:    '#f4e4a6', // Gold for keywords
    str:   '#C3E88D',
    cmt:   '#546E7A',
    num:   '#F78C6C',
    typ:   '#FFCB6B',
    fn:    '#82AAFF',
    op:    '#89DDFF',
    plain: '#EEFFFF',
};

function lex(line: string) {
    const toks: { t: TokType; s: string }[] = [];
    let i = 0;
    while (i < line.length) {
        if (line[i] === '/' && line[i + 1] === '/') {
            toks.push({ t: 'cmt', s: line.slice(i) }); break;
        }
        if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
            const q = line[i]; let j = i + 1;
            while (j < line.length) {
                if (line[j] === '\\') { j += 2; continue; }
                if (line[j] === q) { j++; break; }
                j++;
            }
            toks.push({ t: 'str', s: line.slice(i, j) }); i = j; continue;
        }
        if (/\d/.test(line[i])) {
            const m = line.slice(i).match(/^\d+\.?\d*/);
            const s = m![0]; toks.push({ t: 'num', s }); i += s.length; continue;
        }
        if (/[a-zA-Z_$]/.test(line[i])) {
            const m = line.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
            const w = m![0];
            if (KW.has(w)) toks.push({ t: 'kw', s: w });
            else if (/^[A-Z]/.test(w)) toks.push({ t: 'typ', s: w });
            else if (line[i + w.length] === '(') toks.push({ t: 'fn', s: w });
            else toks.push({ t: 'plain', s: w });
            i += w.length; continue;
        }
        toks.push({ t: 'op', s: line[i] }); i++;
    }
    return toks;
}

// ─── Code Block (ray.so style) ────────────────────────────────────────────────

const CodeBlock = ({ code, hotLines, step }: { code: string; hotLines: number[]; step: number }) => {
    const [activeLine, setActiveLine] = useState(hotLines[0] ?? 0);

    useEffect(() => {
        setActiveLine(hotLines[0] ?? 0);
        let i = 0;
        const id = setInterval(() => {
            i = (i + 1) % hotLines.length;
            setActiveLine(hotLines[i]);
        }, 1600);
        return () => clearInterval(id);
    }, [step]);

    const lines = code.split('\n');

    if (Platform.OS !== 'web') {
        return (
            <View style={s.codeBlock}>
                <Text style={s.codeFallback}>{code}</Text>
            </View>
        );
    }

    return React.createElement('div', {
        style: {
            background: 'linear-gradient(145deg,#2a1f0a 0%,#3d2f14 55%,#1a1408 100%)', // Gold gradient
            borderRadius: 12,
            padding: '14px 0',
            fontFamily: "'JetBrains Mono','Fira Code','Monaco',monospace",
            fontSize: 12,
            lineHeight: '20px',
            overflowX: 'auto' as const,
            overflowY: 'auto' as const,
            maxHeight: 270,
            border: '1px solid rgba(244,228,166,0.25)', // Gold border
            boxShadow: '0 0 40px rgba(244,228,166,0.1),inset 0 1px 0 rgba(255,255,255,0.03)', // Gold glow
            position: 'relative' as const,
            flexShrink: 0,
        },
    },
        React.createElement('div', {
            style: {
                position: 'absolute' as const, top: 8, right: 12,
                fontSize: 9, letterSpacing: 1.5, color: 'rgba(244,228,166,0.55)', // Gold
                fontFamily: 'inherit', textTransform: 'uppercase' as const, userSelect: 'none' as const,
            },
        }, 'tsx'),
        ...lines.map((line, idx) => {
            const hot = idx === activeLine;
            const toks = lex(line);
            return React.createElement('div', {
                key: idx,
                style: {
                    display: 'flex', alignItems: 'baseline',
                    backgroundColor: hot ? 'rgba(244,228,166,0.16)' : 'transparent', // Gold highlight
                    borderLeft: `2px solid ${hot ? '#f4e4a6' : 'transparent'}`, // Gold border
                    paddingLeft: 10, paddingRight: 20, minHeight: 20,
                    transition: 'background-color 350ms ease, border-color 350ms ease',
                },
            },
                React.createElement('span', {
                    style: {
                        color: '#2d2d5c', minWidth: 22, marginRight: 14,
                        textAlign: 'right' as const, userSelect: 'none' as const,
                        fontSize: 10, flexShrink: 0,
                    },
                }, idx + 1),
                React.createElement('span', { style: { whiteSpace: 'pre' as const } },
                    ...toks.map((tok, ti) =>
                        React.createElement('span', {
                            key: ti,
                            style: {
                                color: COLORS[tok.t],
                                textShadow: hot && tok.t !== 'cmt' && tok.t !== 'op'
                                    ? `0 0 14px ${COLORS[tok.t]}99`
                                    : 'none',
                                transition: 'text-shadow 350ms ease',
                            },
                        }, tok.s)
                    )
                )
            );
        })
    );
};

// ─── Pulse Highlight (replaces spotlight) ─────────────────────────────────────

const PulseHighlight = ({
    spot, sw, sh,
}: { spot: Spot; sw: number; sh: number }) => {
    if (Platform.OS !== 'web') return null;

    const x = spot.xFrac * sw;
    const y = spot.yFrac * sh;
    const w = spot.wFrac * sw;
    const h = spot.hFrac * sh;
    const r = spot.radius;

    return React.createElement('div', {
        style: {
            position: 'fixed',
            left: x,
            top: y,
            width: w,
            height: h,
            borderRadius: r,
            border: '2px solid #f4e4a6',
            backgroundColor: 'rgba(244,228,166,0.08)',
            boxShadow: '0 0 20px rgba(244,228,166,0.4), inset 0 0 20px rgba(244,228,166,0.1)',
            pointerEvents: 'none',
            zIndex: 151,
            animation: 'pulse-glow 2s ease-in-out infinite',
        } as any,
    });
};

// Add CSS animation for pulse effect
if (Platform.OS === 'web') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse-glow {
            0%, 100% { 
                opacity: 0.6;
                transform: scale(1);
                box-shadow: 0 0 20px rgba(244,228,166,0.4), inset 0 0 20px rgba(244,228,166,0.1);
            }
            50% { 
                opacity: 0.9;
                transform: scale(1.02);
                box-shadow: 0 0 30px rgba(244,228,166,0.6), inset 0 0 30px rgba(244,228,166,0.2);
            }
        }
    `;
    document.head.appendChild(style);
}

// ─── Playground Components ───────────────────────────────────────────────────

// Particle playground for dots step
const ParticlePlayground = ({ step }: { step: number }) => {
    const mouseX = useSharedValue(0);
    const mouseY = useSharedValue(0);
    const particles = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number>();
    
    useEffect(() => {
        // Initialize particles with default size, will be updated when canvas is ready
        particles.current = Array.from({ length: 25 }, () => ({
            x: Math.random() * 400,
            y: Math.random() * 260,
            vx: 0,
            vy: 0,
        }));
    }, []);

    if (Platform.OS !== 'web') {
        return (
            <View style={s.playground}>
                <Text style={s.playHint}>Particle physics demo (web only)</Text>
            </View>
        );
    }

    return (
        <View style={{ marginBottom: 16 }}>
            {/* Reference image */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#666' }}>Reference:</Text>
                {React.createElement('img', {
                    src: '/gojo.avif',
                    style: { width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }
                })}
                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: '#666', flex: 1 }}>
                    Background image used in particle demo
                </Text>
            </View>
            
            {React.createElement('div', {
                style: {
                    height: 260,
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(244,228,166,0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundImage: 'url(/gojo.avif)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                },
                onMouseMove: (e: any) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    mouseX.value = e.clientX - rect.left;
                    mouseY.value = e.clientY - rect.top;
                },
            },
                React.createElement('canvas', {
                    style: { 
                        display: 'block', 
                        width: '100%', 
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.3)' 
                    },
                    ref: (canvas: HTMLCanvasElement) => {
                        if (!canvas || canvasRef.current === canvas) return;
                        canvasRef.current = canvas;
                        
                        // Set canvas resolution to match display size
                        const rect = canvas.getBoundingClientRect();
                        canvas.width = rect.width;
                        canvas.height = rect.height;
                        
                        // Reinitialize particles for the actual canvas size
                        const particleCount = Math.floor(rect.width / 20);
                        particles.current = Array.from({ length: particleCount }, () => ({
                            x: Math.random() * rect.width,
                            y: Math.random() * rect.height,
                            vx: 0,
                            vy: 0,
                        }));
                        
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        const animate = () => {
                            if (!canvasRef.current) return;
                            
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            
                            particles.current.forEach(p => {
                                const dx = mouseX.value - p.x;
                                const dy = mouseY.value - p.y;
                                const dist = Math.hypot(dx, dy);

                                if (dist < 80) {
                                    p.vx -= (dx / dist) * 2.5;
                                    p.vy -= (dy / dist) * 2.5;
                                }

                                p.x += p.vx * 0.92;
                                p.y += p.vy * 0.92;
                                p.vx *= 0.95;
                                p.vy *= 0.95;

                                // Bounds
                                if (p.x < 0 || p.x > canvas.width) p.vx *= -0.8;
                                if (p.y < 0 || p.y > canvas.height) p.vy *= -0.8;
                                p.x = Math.max(0, Math.min(canvas.width, p.x));
                                p.y = Math.max(0, Math.min(canvas.height, p.y));

                                // Draw particle with glow
                                ctx.shadowColor = '#f4e4a6';
                                ctx.shadowBlur = 10;
                                ctx.fillStyle = '#f4e4a6';
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.shadowBlur = 0;
                            });

                            animationRef.current = requestAnimationFrame(animate);
                        };
                        animate();
                    },
                }),
                React.createElement('div', {
                    style: {
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        fontFamily: 'Space Grotesk',
                        fontSize: 10,
                        color: '#f4e4a6',
                        letterSpacing: 0.5,
                        textShadow: '0 0 10px rgba(0,0,0,0.8)',
                    },
                }, '← move mouse to repel particles')
            )}
        </View>
    );
};

// Filter chips playground
const ChipsPlayground = ({ step }: { step: number }) => {
    const chips = ['all', 'fragment', 'essay', 'collage', 'artifact'];
    const pulses = chips.map(() => useSharedValue(0));
    const [activeChip, setActiveChip] = useState('all');

    const triggerAnimation = () => {
        chips.forEach((_, i) => {
            pulses[i].value = 0;
            pulses[i].value = withDelay(
                i * 80,
                withSequence(
                    withTiming(1, { duration: 600 }),
                    withTiming(0.5, { duration: 400 }),
                    withTiming(1, { duration: 400 }),
                    withTiming(0, { duration: 600 }),
                )
            );
        });
    };

    useEffect(() => {
        triggerAnimation();
    }, [step]);

    return (
        <View style={s.playground}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    {chips.map((chip, i) => {
                        const chipStyle = useAnimatedStyle(() => ({
                            borderColor: `rgba(244,228,166,${0.25 + pulses[i].value * 0.6})`,
                            shadowColor: '#f4e4a6',
                            shadowOpacity: pulses[i].value * 0.5,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 0 },
                        }));

                        return (
                            <TouchableOpacity
                                key={chip}
                                onPress={() => setActiveChip(chip)}
                            >
                                <Animated.View
                                    style={[
                                        {
                                            borderWidth: 1,
                                            borderRadius: 20,
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            backgroundColor: activeChip === chip ? 'rgba(244,228,166,0.2)' : 'rgba(244,228,166,0.1)',
                                        },
                                        chipStyle,
                                    ]}
                                >
                                    <Text style={{ 
                                        fontFamily: 'Space Grotesk', 
                                        fontSize: 11, 
                                        color: activeChip === chip ? '#f4e4a6' : '#999'
                                    }}>
                                        {chip}
                                    </Text>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                
                <TouchableOpacity
                    onPress={triggerAnimation}
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#f4e4a6',
                        backgroundColor: 'rgba(244,228,166,0.1)',
                    }}
                >
                    <Text style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: '#f4e4a6' }}>
                        Replay Animation
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={s.playHint}>← click chips & replay button</Text>
        </View>
    );
};

// Media embeds playground
const MediaPlayground = ({ step }: { step: number }) => {
    const [mediaUrl, setMediaUrl] = useState('https://www.youtube.com/watch?v=q86g1aop6a8&list=RDq86g1aop6a8&start_radio=1');
    const [embedId, setEmbedId] = useState('');
    const [mediaType, setMediaType] = useState<'spotify' | 'youtube' | 'tiktok' | null>(null);

    const extractEmbedId = (url: string) => {
        if (url.includes('spotify.com/track/')) {
            setMediaType('spotify');
            return url.split('track/')[1].split('?')[0];
        }
        if (url.includes('youtube.com/watch?v=')) {
            setMediaType('youtube');
            return url.split('v=')[1].split('&')[0];
        }
        if (url.includes('youtu.be/')) {
            setMediaType('youtube');
            return url.split('youtu.be/')[1].split('?')[0];
        }
        if (url.includes('tiktok.com/') && url.includes('/video/')) {
            setMediaType('tiktok');
            return url.split('/video/')[1].split('?')[0];
        }
        setMediaType(null);
        return '';
    };

    useEffect(() => {
        const id = extractEmbedId(mediaUrl);
        setEmbedId(id);
    }, [mediaUrl]);

    const sampleUrls = [
        { type: 'Spotify', url: 'https://open.spotify.com/track/5LO3M8pfuprpwNN1p3tuxW' },
        { type: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { type: 'TikTok', url: 'https://www.tiktok.com/@username/video/1234567890123456789' },
    ];

    if (Platform.OS !== 'web') {
        return (
            <View style={s.playground}>
                <Text style={s.playHint}>Media embeds demo (web only)</Text>
            </View>
        );
    }

    return (
        <View style={s.playground}>
            <View style={{ padding: 16, flex: 1 }}>
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: 'rgba(244,228,166,0.3)',
                        borderRadius: 8,
                        padding: 12,
                        fontFamily: 'Space Grotesk',
                        fontSize: 12,
                        color: '#f4e4a6',
                        backgroundColor: 'rgba(244,228,166,0.05)',
                        marginBottom: 12,
                    }}
                    placeholder="Paste Spotify, YouTube, or TikTok URL..."
                    placeholderTextColor="#666"
                    value={mediaUrl}
                    onChangeText={setMediaUrl}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {sampleUrls.map((sample, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setMediaUrl(sample.url)}
                            style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 4,
                                borderWidth: 1,
                                borderColor: 'rgba(244,228,166,0.3)',
                                backgroundColor: 'rgba(244,228,166,0.1)',
                            }}
                        >
                            <Text style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#f4e4a6' }}>
                                {sample.type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {embedId && mediaType && (
                    <View style={{ flex: 1, minHeight: 200 }}>
                        {mediaType === 'spotify' && React.createElement('iframe', {
                            src: `https://open.spotify.com/embed/track/${embedId}?utm_source=generator&theme=0`,
                            width: '100%',
                            height: '152',
                            frameBorder: '0',
                            allow: 'encrypted-media',
                            style: { borderRadius: 8 }
                        })}
                        
                        {mediaType === 'youtube' && React.createElement('iframe', {
                            src: `https://www.youtube.com/embed/${embedId}`,
                            width: '100%',
                            height: '200',
                            frameBorder: '0',
                            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                            allowFullScreen: true,
                            style: { borderRadius: 8 }
                        })}
                        
                        {mediaType === 'tiktok' && (
                            <View style={{ 
                                padding: 20, 
                                borderRadius: 8, 
                                borderWidth: 1, 
                                borderColor: 'rgba(244,228,166,0.3)',
                                backgroundColor: 'rgba(244,228,166,0.05)',
                                alignItems: 'center'
                            }}>
                                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: '#f4e4a6', textAlign: 'center' }}>
                                    TikTok Embed Preview
                                </Text>
                                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#666', textAlign: 'center', marginTop: 4 }}>
                                    ID: {embedId}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {!embedId && mediaUrl && (
                    <View style={{ 
                        padding: 20, 
                        borderRadius: 8, 
                        borderWidth: 1, 
                        borderColor: 'rgba(244,228,166,0.3)',
                        backgroundColor: 'rgba(244,228,166,0.05)',
                        alignItems: 'center'
                    }}>
                        <Text style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: '#666', textAlign: 'center' }}>
                            URL not recognized. Try a Spotify track, YouTube video, or TikTok link.
                        </Text>
                    </View>
                )}
            </View>
            <Text style={s.playHint}>← paste URLs or try samples above</Text>
        </View>
    );
};
const SpacesPlayground = ({ step }: { step: number }) => {
    const [currentSpace, setCurrentSpace] = useState('mind');
    const [rippleVisible, setRippleVisible] = useState(false);
    const rippleScale = useSharedValue(0);

    const switchSpace = (space: string) => {
        setRippleVisible(true);
        rippleScale.value = 0;
        rippleScale.value = withTiming(1, { duration: 600 }, () => {
            runOnJS(() => setRippleVisible(false))();
        });
        
        setTimeout(() => {
            setCurrentSpace(space);
        }, 300);
    };

    const rippleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: rippleScale.value }],
        opacity: 1 - rippleScale.value,
    }));

    const spaces = ['mind', 'matter', 'confluence'];

    return (
        <View style={s.playground}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
                    {spaces.map(space => (
                        <TouchableOpacity
                            key={space}
                            onPress={() => switchSpace(space)}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: currentSpace === space ? '#f4e4a6' : 'rgba(244,228,166,0.3)',
                                backgroundColor: currentSpace === space ? 'rgba(244,228,166,0.2)' : 'transparent',
                            }}
                        >
                            <Text style={{
                                fontFamily: 'Space Grotesk',
                                fontSize: 12,
                                color: currentSpace === space ? '#f4e4a6' : '#999',
                            }}>
                                {space}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 16, color: '#f4e4a6', marginBottom: 8 }}>
                    Current: {currentSpace}
                </Text>
                
                {rippleVisible && (
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                width: 100,
                                height: 100,
                                borderRadius: 50,
                                borderWidth: 2,
                                borderColor: '#f4e4a6',
                            },
                            rippleStyle,
                        ]}
                    />
                )}
            </View>
            <Text style={s.playHint}>← click spaces to see transition effects</Text>
        </View>
    );
};

// Simple node playground (just physics, no recenter)
const NodePlayground = ({ step }: { step: number }) => {
    const nodes = [
        { label: 'idea', initX: -90, initY: -30 },
        { label: 'work', initX: 40, initY: 20 },
        { label: 'art', initX: -20, initY: 80 },
    ];

    return (
        <View style={s.playground}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={s.playCanvas}>
                    {nodes.map((node, i) => (
                        <PlayNode
                            key={node.label}
                            label={node.label}
                            initX={node.initX}
                            initY={node.initY}
                            accent="#f4e4a6"
                        />
                    ))}
                    
                    <Text style={s.playHint}>← fling any node to feel physics</Text>
                </View>
            </GestureHandlerRootView>
        </View>
    );
};

// Recenter playground (enhanced node playground)
const RecenterPlayground = ({ step }: { step: number }) => {
    const [recenterTrigger, setRecenterTrigger] = useState(0);
    
    const nodes = [
        { label: 'idea', initX: -90, initY: -30 },
        { label: 'work', initX: 40, initY: 20 },
        { label: 'art', initX: -20, initY: 80 },
    ];

    if (Platform.OS !== 'web') {
        return (
            <View style={s.playground}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <View style={s.playCanvas}>
                        {nodes.map((node, i) => (
                            <PlayNode
                                key={node.label}
                                label={node.label}
                                initX={node.initX}
                                initY={node.initY}
                                accent="#f4e4a6"
                                recenterTrigger={recenterTrigger}
                            />
                        ))}
                        
                        <TouchableOpacity
                            onPress={() => setRecenterTrigger((t: number) => t + 1)}
                            style={{
                                position: 'absolute',
                                bottom: 20,
                                alignSelf: 'center',
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                borderWidth: 2,
                                borderColor: '#f4e4a6',
                                backgroundColor: 'rgba(244,228,166,0.2)',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#f4e4a6', fontSize: 18, fontWeight: 'bold' }}>◎</Text>
                        </TouchableOpacity>
                        
                        <Text style={[s.playHint, { bottom: 70, color: '#f4e4a6' }]}>
                            ← drag nodes, then press ◎ to recenter
                        </Text>
                    </View>
                </GestureHandlerRootView>
            </View>
        );
    }

    return (
        <View style={{ marginBottom: 16 }}>
            {/* Reference image */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#666' }}>Reference:</Text>
                {React.createElement('img', {
                    src: '/pain.webp',
                    style: { width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }
                })}
                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: '#666', flex: 1 }}>
                    Background image used in recenter demo
                </Text>
            </View>
            
            {/* Web-specific background container */}
            {React.createElement('div', {
                style: {
                    height: 260,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(244,228,166,0.2)',
                    marginBottom: 16,
                    overflow: 'hidden',
                    backgroundImage: 'url(/pain.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                },
            },
                React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }
                },
                    React.createElement(GestureHandlerRootView, { style: { flex: 1, width: '100%', height: '100%' } },
                        React.createElement(View, { style: { flex: 1, alignItems: 'center', justifyContent: 'center' } },
                            ...nodes.map((node, i) => 
                                React.createElement(PlayNode, {
                                    key: node.label,
                                    label: node.label,
                                    initX: node.initX,
                                    initY: node.initY,
                                    accent: '#f4e4a6',
                                    recenterTrigger: recenterTrigger,
                                })
                            ),
                            
                            React.createElement(TouchableOpacity, {
                                onPress: () => setRecenterTrigger((t: number) => t + 1),
                                style: {
                                    position: 'absolute',
                                    bottom: 20,
                                    alignSelf: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    borderWidth: 2,
                                    borderColor: '#f4e4a6',
                                    backgroundColor: 'rgba(244,228,166,0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    shadowColor: '#f4e4a6',
                                    shadowOpacity: 0.5,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 0 },
                                }
                            },
                                React.createElement(Text, {
                                    style: { color: '#f4e4a6', fontSize: 18, fontWeight: 'bold' }
                                }, '◎')
                            ),
                            
                            React.createElement(Text, {
                                style: {
                                    position: 'absolute',
                                    bottom: 70,
                                    fontFamily: 'Space Grotesk',
                                    fontSize: 10,
                                    color: '#f4e4a6',
                                    letterSpacing: 0.5,
                                    textShadow: '0 0 10px rgba(0,0,0,0.8)',
                                }
                            }, '← drag nodes, then press ◎ to recenter')
                        )
                    )
                )
            )}
        </View>
    );
};

// Capture playground
const CapturePlayground = ({ step }: { step: number }) => {
    const [captureOpen, setCaptureOpen] = useState(false);
    const [text, setText] = useState('');
    const translateY = useSharedValue(100);

    useEffect(() => {
        translateY.value = withSpring(captureOpen ? 0 : 100);
    }, [captureOpen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as any)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            
            if (e.key === '/') {
                e.preventDefault();
                setCaptureOpen(v => !v);
            }
        };
        
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const panelStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <View style={s.playground}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <Text style={{ fontFamily: 'Space Grotesk', fontSize: 14, color: '#f4e4a6', marginBottom: 20 }}>
                    Press "/" to toggle capture panel
                </Text>
                
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: 'rgba(244,228,166,0.3)',
                        borderRadius: 8,
                        padding: 12,
                        width: 200,
                        fontFamily: 'Space Grotesk',
                        fontSize: 12,
                        color: '#f4e4a6',
                        backgroundColor: 'rgba(244,228,166,0.05)',
                    }}
                    placeholder="Try typing here..."
                    placeholderTextColor="#666"
                    value={text}
                    onChangeText={setText}
                />
                
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            bottom: 0,
                            left: 20,
                            right: 20,
                            height: 80,
                            backgroundColor: 'rgba(244,228,166,0.1)',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(244,228,166,0.3)',
                            padding: 16,
                        },
                        panelStyle,
                    ]}
                >
                    <Text style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: '#f4e4a6' }}>
                        Quick Capture Panel
                    </Text>
                    <Text style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#666', marginTop: 4 }}>
                        This would be the capture interface
                    </Text>
                </Animated.View>
            </View>
            <Text style={s.playHint}>← press "/" (not while typing in input)</Text>
        </View>
    );
};

// Enhanced PlayNode with optional recenter support
const PlayNode = ({ label, initX, initY, accent, recenterTrigger }: {
    label: string; initX: number; initY: number; accent: string; recenterTrigger?: number;
}) => {
    const x = useSharedValue(initX);
    const y = useSharedValue(initY);
    const sc = useSharedValue(1);

    // Recenter effect (only if recenterTrigger is provided)
    useEffect(() => {
        if (recenterTrigger === undefined || recenterTrigger === 0) return;
        cancelAnimation(x);
        cancelAnimation(y);
        x.value = withSpring(initX, { damping: 14, stiffness: 90, mass: 1.2 });
        y.value = withSpring(initY, { damping: 14, stiffness: 90 });
    }, [recenterTrigger, initX, initY]);

    const pan = Gesture.Pan()
        .onBegin(() => { cancelAnimation(x); cancelAnimation(y); sc.value = withSpring(1.12); })
        .onChange(e => { x.value += e.changeX; y.value += e.changeY; })
        .onFinalize(e => {
            sc.value = withSpring(1);
            x.value = withDecay({ velocity: e.velocityX });
            y.value = withDecay({ velocity: e.velocityY });
        });

    const aStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }, { translateY: y.value }, { scale: sc.value }],
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[s.playNode, aStyle, { borderColor: accent }]}>
                <Text style={[s.playNodeLabel, { color: accent }]}>{label}</Text>
                <Text style={s.playNodeHint}>drag me</Text>
            </Animated.View>
        </GestureDetector>
    );
};

// ─── Main Overlay ─────────────────────────────────────────────────────────────

export const DevModeOverlay = ({
    onClose, screenW, screenH,
}: {
    onClose: () => void;
    screenW: number;
    screenH: number;
}) => {
    const [step, setStep] = useState(0);
    const current = STEPS[step];

    const cardOpacity = useSharedValue(0);
    const cardY = useSharedValue(24);

    const animIn = () => {
        cardOpacity.value = withTiming(1, { duration: 280 });
        cardY.value = withSpring(0, { damping: 20, stiffness: 160 });
    };
    const animOut = (cb: () => void) => {
        cardOpacity.value = withTiming(0, { duration: 160 });
        cardY.value = withTiming(16, { duration: 160 }, (done) => {
            if (done) runOnJS(cb)();
        });
    };

    useEffect(() => { animIn(); }, []);

    const goTo = (next: number) => {
        animOut(() => {
            setStep(next);
            cardY.value = 24;
            animIn();
        });
    };

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardY.value }],
    }));

    const progress = ((step + 1) / STEPS.length) * 100;
    const isFull = current.isPlayground;

    return (
        <View style={[StyleSheet.absoluteFillObject, s.root]}>
            {/* Simple dark overlay */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 150 }]} />

            {/* Tap outside to close (only for non-playground steps) */}
            {!isFull && (
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    onPress={onClose}
                    activeOpacity={1}
                />
            )}

            {/* Card */}
            <Animated.View style={[s.card, isFull ? s.cardFull : s.cardCorner, cardStyle]}>
                {/* Header */}
                <View style={s.hdr}>
                    <View style={s.badge}><Text style={s.badgeTxt}>dev mode</Text></View>
                    <Text style={s.stepTxt}>{step + 1} / {STEPS.length}</Text>
                    <TouchableOpacity onPress={onClose}><Text style={s.closeTxt}>×</Text></TouchableOpacity>
                </View>

                {/* Progress */}
                <View style={s.progBg}>
                    <View style={[s.progFill, { width: `${progress}%` as any }]} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {/* Title */}
                    <Text style={s.title}>{current.title}</Text>
                    <Text style={s.sub}>{current.sub}</Text>
                    <Text style={s.body}>{current.body}</Text>

                    {/* Different playgrounds based on step */}
                    {current.isPlayground && (
                        <>
                            {current.id === 'dots' && <ParticlePlayground step={step} />}
                            {current.id === 'chips' && <ChipsPlayground step={step} />}
                            {current.id === 'spaces' && <SpacesPlayground step={step} />}
                            {current.id === 'media' && <MediaPlayground step={step} />}
                            {current.id === 'nodes' && <NodePlayground step={step} />}
                            {current.id === 'recenter' && <RecenterPlayground step={step} />}
                            {current.id === 'capture' && <CapturePlayground step={step} />}
                        </>
                    )}

                    {/* Code */}
                    <CodeBlock code={current.code} hotLines={current.hotLines} step={step} />
                </ScrollView>

                {/* Nav */}
                <View style={s.nav}>
                    <TouchableOpacity
                        style={[s.navBtn, step === 0 && s.navBtnDisabled]}
                        onPress={() => step > 0 && goTo(step - 1)}
                        disabled={step === 0}>
                        <Text style={s.navTxt}>← prev</Text>
                    </TouchableOpacity>
                    {step < STEPS.length - 1 ? (
                        <TouchableOpacity style={[s.navBtn, s.navBtnPrimary]} onPress={() => goTo(step + 1)}>
                            <Text style={[s.navTxt, { color: '#0a0a18' }]}>next →</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[s.navBtn, s.navBtnPrimary]} onPress={onClose}>
                            <Text style={[s.navTxt, { color: '#0a0a18' }]}>done ✓</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: {
        zIndex: 200,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 20,
    },

    // Card — small corner version (most steps)
    card: {
        backgroundColor: '#1a1408', // Dark gold background
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(244,228,166,0.4)', // Gold border
        zIndex: 210,
        shadowColor: '#f4e4a6', // Gold shadow
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 48,
        elevation: 30,
    },
    cardCorner: {
        width: 420,
        maxHeight: 600,
        padding: 20,
    },
    cardFull: {
        // playground mode — wider, centered
        alignSelf: 'center',
        width: '100%',
        maxWidth: 860,
        maxHeight: 640,
        padding: 20,
    },

    hdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    badge: {
        backgroundColor: 'rgba(244,228,166,0.2)', // Gold background
        borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: '#f4e4a6', marginRight: 'auto', // Gold border
    },
    badgeTxt: {
        fontFamily: 'Space Grotesk', fontSize: 9,
        letterSpacing: 1.8, color: '#f4e4a6', textTransform: 'uppercase', // Gold text
    },
    stepTxt: { fontFamily: 'Space Grotesk', fontSize: 10, color: '#3d3d6a', marginRight: 14 },
    closeTxt: { fontFamily: 'Space Grotesk', fontSize: 22, color: '#3d3d6a', lineHeight: 26 },

    progBg: { height: 2, backgroundColor: '#1a1a2e', borderRadius: 1, marginBottom: 18, overflow: 'hidden' },
    progFill: { height: 2, backgroundColor: '#f4e4a6', borderRadius: 1 }, // Gold progress

    title: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: '#f0f0f0', marginBottom: 4 },
    sub: {
        fontFamily: 'Space Grotesk', fontSize: 11, letterSpacing: 0.5,
        color: '#f4e4a6', backgroundColor: 'rgba(244,228,166,0.1)', // Gold
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
        alignSelf: 'flex-start', marginBottom: 12,
    },
    body: { fontFamily: 'Space Grotesk', fontSize: 12, lineHeight: 20, color: '#888', marginBottom: 16 },

    nav: { flexDirection: 'row', gap: 10, marginTop: 14 },
    navBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 8,
        borderWidth: 1, borderColor: '#1e1e3a', alignItems: 'center',
    },
    navBtnDisabled: { opacity: 0.25 },
    navBtnPrimary: { backgroundColor: '#f4e4a6', borderColor: '#f4e4a6' }, // Gold primary button
    navTxt: { fontFamily: 'Space Grotesk', fontSize: 12, letterSpacing: 0.5, color: '#666' },

    // Code fallback (non-web)
    codeBlock: { backgroundColor: '#0f0c29', borderRadius: 8, padding: 12, marginBottom: 12 },
    codeFallback: { fontFamily: 'Space Grotesk', fontSize: 11, color: '#EEFFFF' },

    // Playground
    playground: {
        height: 260,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(244,228,166,0.2)', // Gold border
        marginBottom: 16,
        overflow: 'hidden',
    },
    playCanvas: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playNode: {
        position: 'absolute',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: 'rgba(10,10,20,0.8)',
        backdropFilter: 'blur(8px)',
        cursor: 'grab',
    } as any,
    playNodeLabel: { fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: '600' },
    playNodeHint: { fontFamily: 'Space Grotesk', fontSize: 9, color: '#333', marginTop: 2, letterSpacing: 0.5 },
    playHint: {
        position: 'absolute', bottom: 12,
        fontFamily: 'Space Grotesk', fontSize: 10, color: '#333', letterSpacing: 0.5,
    },
});
