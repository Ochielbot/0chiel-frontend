/**
 * DevMode.tsx — immersive site explainer
 *
 * - SVG spotlight that animates over real UI elements
 * - ray.so-style syntax highlighting with glow animations
 * - Live node-physics playground (draggable nodes + live code)
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, withDecay, cancelAnimation,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

// ─── Types ────────────────────────────────────────────────────────────────────

type TokType = 'kw' | 'str' | 'cmt' | 'num' | 'typ' | 'fn' | 'op' | 'plain';

interface Spot {
    xFrac: number; yFrac: number;
    wFrac: number; hFrac: number;
    radius: number;
}

interface DevStep {
    id: string;
    title: string;
    sub: string;
    body: string;
    code: string;
    spot: Spot | null;
    isPlayground?: boolean;
    hotLines: number[];
}

// ─── Step Data ────────────────────────────────────────────────────────────────

const STEPS: DevStep[] = [
    {
        id: 'dots',
        title: '⚇ living grid',
        sub: 'ParticleBackground',
        body: 'Every dot is a canvas particle. Your cursor position is a Reanimated shared value — on each animation frame, each particle measures distance to the cursor and is pushed away if within 80px. No re-renders, pure JS-thread math.',
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
        spot: { xFrac: 0, yFrac: 0, wFrac: 1, hFrac: 1, radius: 0 },
        hotLines: [5, 6, 7, 8, 12, 13],
    },
    {
        id: 'chips',
        title: '◯ filter chips',
        sub: 'withDelay + withSequence',
        body: 'On mount each chip schedules a staggered pulse via withDelay(n×80ms). The sequence tweens border opacity 0→1→0.5→1→0, creating a ripple that trails across the row — all driven by a single shared value.',
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
        spot: { xFrac: 0, yFrac: 0.1, wFrac: 0.72, hFrac: 0.08, radius: 20 },
        hotLines: [2, 3, 4, 5, 6, 7, 11, 12, 13],
    },
    {
        id: 'nodes',
        title: '□ node physics',
        sub: 'Gesture.Pan + withDecay',
        body: 'Drag the nodes below. Gesture.Pan() fires onChange on the JS thread with delta values — we add directly to shared values (no setState). onFinalize captures fling velocity and passes it to withDecay for momentum.',
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
        spot: null,
        isPlayground: true,
        hotLines: [6, 7, 8, 11, 12, 13, 14, 15],
    },
    {
        id: 'spaces',
        title: '△ spaces',
        sub: 'switchSpace + burst',
        body: 'mind / matter / confluence are conceptual layers. Switching fires a ripple + particle burst immediately, then a 300ms setTimeout flips the space state — giving the animation time to play before content swaps.',
        code: `const switchSpace = (space: Space) => {
  // visual effects fire instantly
  setRippleCenter({ x: width/2, y: height/2 });
  setRippleVisible(true);
  setBurstVisible(true);

  // content change is delayed 300ms
  // so the burst plays first
  setTimeout(() => {
    setCurrentSpace(space);
    setBurstVisible(false);
  }, 300);
};

// each node carries a space field
const visible = THOUGHTS.filter(t =>
  t.space === currentSpace ||
  t.space === 'confluence');`,
        spot: { xFrac: 0.6, yFrac: 0, wFrac: 0.4, hFrac: 0.065, radius: 0 },
        hotLines: [8, 9, 10, 11, 14, 15, 16],
    },
    {
        id: 'recenter',
        title: '◎ spring recenter',
        sub: 'recenterTrigger + withSpring',
        body: 'Pressing ◎ increments a counter prop. Each FloatingNode watches it in a useEffect — when it changes, shared X/Y values spring back to initialX/Y. No unmount/remount, just smooth animation driven by mass + damping.',
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
        spot: { xFrac: 0.43, yFrac: 0.87, wFrac: 0.14, hFrac: 0.1, radius: 50 },
        hotLines: [6, 7, 8, 9, 10, 11, 12],
    },
    {
        id: 'capture',
        title: '/ quick capture',
        sub: 'keydown + CapturePanel',
        body: 'A global keydown listener on window catches "/" and toggles the capture panel. It guards against INPUT/TEXTAREA focus, preventing interference while typing. The panel slides in/out via spring-animated translateY.',
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
        spot: { xFrac: 0.87, yFrac: 0.87, wFrac: 0.1, hFrac: 0.1, radius: 25 },
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
    kw:    '#C792EA',
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
            background: 'linear-gradient(145deg,#0f0c29 0%,#1a1040 55%,#0a0a18 100%)',
            borderRadius: 12,
            padding: '14px 0',
            fontFamily: "'JetBrains Mono','Fira Code','Monaco',monospace",
            fontSize: 12,
            lineHeight: '20px',
            overflowX: 'auto' as const,
            overflowY: 'auto' as const,
            maxHeight: 270,
            border: '1px solid rgba(124,58,237,0.25)',
            boxShadow: '0 0 40px rgba(124,58,237,0.1),inset 0 1px 0 rgba(255,255,255,0.03)',
            position: 'relative' as const,
            flexShrink: 0,
        },
    },
        React.createElement('div', {
            style: {
                position: 'absolute' as const, top: 8, right: 12,
                fontSize: 9, letterSpacing: 1.5, color: 'rgba(124,58,237,0.55)',
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
                    backgroundColor: hot ? 'rgba(124,58,237,0.16)' : 'transparent',
                    borderLeft: `2px solid ${hot ? '#a78bfa' : 'transparent'}`,
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

// ─── SVG Spotlight ────────────────────────────────────────────────────────────

const SpotlightSVG = ({
    spot, sw, sh,
}: { spot: Spot; sw: number; sh: number }) => {
    if (Platform.OS !== 'web') return null;

    const x = spot.xFrac * sw;
    const y = spot.yFrac * sh;
    const w = spot.wFrac * sw;
    const h = spot.hFrac * sh;
    const r = spot.radius;

    const transition = 'x 600ms cubic-bezier(0.34,1.56,0.64,1),y 600ms cubic-bezier(0.34,1.56,0.64,1),width 600ms cubic-bezier(0.34,1.56,0.64,1),height 600ms cubic-bezier(0.34,1.56,0.64,1)';

    return React.createElement('svg', {
        style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 151 } as any,
        width: '100%', height: '100%',
    },
        React.createElement('defs', null,
            React.createElement('mask', { id: 'dm-mask' },
                React.createElement('rect', { width: '100%', height: '100%', fill: 'white' }),
                React.createElement('rect', { x, y, width: w, height: h, rx: r, ry: r, fill: 'black', style: { transition } })
            )
        ),
        // dark overlay with cutout
        React.createElement('rect', {
            width: '100%', height: '100%',
            fill: 'rgba(0,0,0,0.72)', mask: 'url(#dm-mask)',
        }),
        // glowing border around spotlight
        React.createElement('rect', {
            x: x - 1, y: y - 1, width: w + 2, height: h + 2,
            rx: r + 1, ry: r + 1,
            fill: 'none', stroke: 'rgba(167,139,250,0.6)', strokeWidth: 1.5,
            style: { transition } as any,
        }),
        // corner accents
        ...([
            [x + 4, y + 4], [x + w - 4, y + 4],
            [x + 4, y + h - 4], [x + w - 4, y + h - 4],
        ] as [number, number][]).map(([cx, cy], i) =>
            React.createElement('circle', {
                key: i, cx, cy, r: 3,
                fill: '#a78bfa', opacity: 0.7,
            })
        )
    );
};

// ─── Node Playground ─────────────────────────────────────────────────────────

const PlayNode = ({ label, initX, initY, accent }: {
    label: string; initX: number; initY: number; accent: string;
}) => {
    const x = useSharedValue(initX);
    const y = useSharedValue(initY);
    const sc = useSharedValue(1);

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

const NodePlayground = ({ step }: { step: number }) => (
    <View style={s.playground}>
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={s.playCanvas}>
                <PlayNode label="idea" initX={-90} initY={-30} accent="#C792EA" />
                <PlayNode label="work"  initX={40}  initY={20}  accent="#82AAFF" />
                <PlayNode label="art"   initX={-20} initY={80}  accent="#C3E88D" />
                <Text style={s.playHint}>← fling any node to feel physics</Text>
            </View>
        </GestureHandlerRootView>
    </View>
);

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
            {/* SVG spotlight */}
            {current.spot && (
                <SpotlightSVG spot={current.spot} sw={screenW} sh={screenH} />
            )}

            {/* Dark fill when no spotlight (playground/full screen) */}
            {!current.spot && (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.82)', zIndex: 151 }]} />
            )}

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

                    {/* Playground for node physics */}
                    {current.isPlayground && <NodePlayground step={step} />}

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

// Need runOnJS from reanimated
import { runOnJS } from 'react-native-reanimated';

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
        backgroundColor: '#0c0b1a',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.4)',
        zIndex: 210,
        shadowColor: '#7c3aed',
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
        backgroundColor: 'rgba(124,58,237,0.2)',
        borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: '#7c3aed', marginRight: 'auto',
    },
    badgeTxt: {
        fontFamily: 'Space Grotesk', fontSize: 9,
        letterSpacing: 1.8, color: '#a78bfa', textTransform: 'uppercase',
    },
    stepTxt: { fontFamily: 'Space Grotesk', fontSize: 10, color: '#3d3d6a', marginRight: 14 },
    closeTxt: { fontFamily: 'Space Grotesk', fontSize: 22, color: '#3d3d6a', lineHeight: 26 },

    progBg: { height: 2, backgroundColor: '#1a1a2e', borderRadius: 1, marginBottom: 18, overflow: 'hidden' },
    progFill: { height: 2, backgroundColor: '#7c3aed', borderRadius: 1 },

    title: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: '#f0f0f0', marginBottom: 4 },
    sub: {
        fontFamily: 'Space Grotesk', fontSize: 11, letterSpacing: 0.5,
        color: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)',
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
    navBtnPrimary: { backgroundColor: '#a78bfa', borderColor: '#a78bfa' },
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
        borderColor: 'rgba(124,58,237,0.2)',
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
