import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

// Type declarations for web-only APIs
declare const window: any;
declare const navigator: any;
declare const atob: any;
declare const btoa: any;

interface AdminLoginProps {
    onLogin: (sessionId: string) => void;
    onClose: () => void;
    currentSpace: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onClose, currentSpace }) => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [usePasskey, setUsePasskey] = useState(false);
    const [passkeyAvailable, setPasskeyAvailable] = useState(false);

    const bg = currentSpace === 'matter' ? '#fff' : '#0a0a0a';
    const fg = currentSpace === 'matter' ? '#111' : '#f0f0f0';
    const border = currentSpace === 'matter' ? '#ddd' : '#222';
    const placeholder = currentSpace === 'matter' ? '#aaa' : '#555';

    // Check if passkey is available
    React.useEffect(() => {
        if (typeof window !== 'undefined' && typeof (window as any).PublicKeyCredential !== 'undefined') {
            setPasskeyAvailable(true);
            // Auto-switch to passkey if available
            setUsePasskey(true);
        }
    }, []);

    const registerPasskey = async (username: string) => {
        try {
            // Begin registration
            const beginResponse = await fetch('http://localhost:3001/api/passkey/register/begin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!beginResponse.ok) {
                console.error('Failed to begin passkey registration');
                return;
            }

            const options = await beginResponse.json();

            // Create credential
            const credential = await (navigator as any).credentials.create({
                publicKey: {
                    challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), (c: any) => (c as string).charCodeAt(0)),
                    rp: options.rp,
                    user: {
                        id: Uint8Array.from(options.user.id, (c: any) => (c as string).charCodeAt(0)),
                        name: options.user.name,
                        displayName: options.user.displayName
                    },
                    pubKeyCredParams: options.pubKeyCredParams,
                    timeout: options.timeout,
                    attestation: options.attestation,
                    authenticatorSelection: options.authenticatorSelection
                }
            });

            if (!credential) {
                console.log('Passkey registration cancelled');
                return;
            }

            // Complete registration
            const completeResponse = await fetch('http://localhost:3001/api/passkey/register/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    credential: {
                        id: credential.id,
                        rawId: btoa(String.fromCharCode(...new Uint8Array((credential as any).rawId))),
                        type: credential.type,
                        transports: (credential as any).response?.getTransports?.() || ['internal']
                    }
                })
            });

            if (completeResponse.ok) {
                console.log('Passkey registered successfully');
            }
        } catch (error) {
            console.error('Passkey registration error:', error);
        }
    };

    const handlePasskeyLogin = async () => {
        setLoading(true);
        setError('');

        try {
            // Begin authentication
            const beginResponse = await fetch('http://localhost:3001/api/passkey/authenticate/begin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!beginResponse.ok) {
                const data = await beginResponse.json();
                setError(data.error || 'Passkey not set up. Use password to login.');
                setUsePasskey(false);
                setLoading(false);
                return;
            }

            const options = await beginResponse.json();

            // Get credential from authenticator
            const assertion = await (navigator as any).credentials.get({
                publicKey: {
                    challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), (c: any) => (c as string).charCodeAt(0)),
                    allowCredentials: options.allowCredentials.map((cred: any) => ({
                        type: cred.type,
                        id: Uint8Array.from(atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')), (c: any) => (c as string).charCodeAt(0)),
                        transports: cred.transports
                    })),
                    timeout: options.timeout,
                    userVerification: options.userVerification,
                    rpId: options.rpId
                }
            });

            if (!assertion) {
                setError('Authentication cancelled');
                setLoading(false);
                return;
            }

            // Complete authentication
            const completeResponse = await fetch('http://localhost:3001/api/passkey/authenticate/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username,
                    assertion: {
                        id: assertion.id,
                        rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
                        type: assertion.type
                    }
                })
            });

            const data = await completeResponse.json();

            if (completeResponse.ok) {
                localStorage.setItem('ochiel_session', data.sessionId);
                onLogin(data.sessionId);
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Passkey error:', error);
            setError('Passkey authentication failed. Try password instead.');
            setUsePasskey(false);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async () => {
        if (!username || !password) {
            setError('Username and password required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('ochiel_session', data.sessionId);
                
                // Offer to set up passkey if available and not already set up
                if (passkeyAvailable && !usePasskey) {
                    const setupPasskey = typeof window !== 'undefined' && (window as any).confirm('Set up passkey/fingerprint for faster login next time?');
                    if (setupPasskey) {
                        await registerPasskey(username);
                    }
                }
                
                onLogin(data.sessionId);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (error) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        if (usePasskey && passkeyAvailable) {
            handlePasskeyLogin();
        } else {
            handlePasswordLogin();
        }
    };

    return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <View style={[styles.modal, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[styles.title, { color: fg }]}>admin login</Text>
                
                {passkeyAvailable && (
                    <TouchableOpacity 
                        style={[styles.toggleButton, { borderColor: border }]}
                        onPress={() => setUsePasskey(!usePasskey)}
                    >
                        <Text style={[styles.toggleText, { color: fg }]}>
                            {usePasskey ? 'using passkey/fingerprint' : 'using password'}
                        </Text>
                        <Text style={[styles.toggleHint, { color: placeholder }]}>
                            tap to switch
                        </Text>
                    </TouchableOpacity>
                )}
                
                <TextInput
                    style={[styles.input, { color: fg, borderColor: border }]}
                    placeholder="username"
                    placeholderTextColor={placeholder}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
                
                {!usePasskey && (
                    <TextInput
                        style={[styles.input, { color: fg, borderColor: border }]}
                        placeholder="password"
                        placeholderTextColor={placeholder}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                )}
                
                {error ? (
                    <Text style={[styles.error, { color: '#ff6b6b' }]}>{error}</Text>
                ) : null}
                
                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton, { borderColor: border }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.buttonText, { color: fg }]}>cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.button, 
                            styles.loginButton, 
                            { 
                                borderColor: '#f4e4a6',
                                backgroundColor: loading ? 'transparent' : '#f4e4a6'
                            }
                        ]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={[
                            styles.buttonText, 
                            { color: loading ? fg : '#000' }
                        ]}>
                            {loading ? 'authenticating...' : usePasskey ? 'authenticate →' : 'login →'}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                {!usePasskey && (
                    <Text style={[styles.hint, { color: placeholder }]}>
                        default: admin / admin123
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    modal: {
        width: 320,
        padding: 24,
        borderRadius: 8,
        borderWidth: 1,
    },
    title: {
        fontFamily: 'Space Grotesk',
        fontSize: 16,
        letterSpacing: 1,
        marginBottom: 20,
        textAlign: 'center',
    },
    toggleButton: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    toggleText: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        marginBottom: 4,
    },
    toggleHint: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        fontStyle: 'italic',
    },
    input: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        marginBottom: 12,
    },
    error: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        marginBottom: 12,
        textAlign: 'center',
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    button: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        alignItems: 'center',
    },
    cancelButton: {},
    loginButton: {},
    buttonText: {
        fontFamily: 'Space Grotesk',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    hint: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});