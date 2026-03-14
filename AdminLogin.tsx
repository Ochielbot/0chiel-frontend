import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

// Type declarations for web-only APIs
declare const window: any;
declare const localStorage: any;

interface AdminLoginProps {
    onLogin: (sessionId: string) => void;
    onClose: () => void;
    currentSpace: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onClose, currentSpace }) => {
    const username = 'robert'; // Fixed username, not editable
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE = process.env.REACT_APP_API_URL || 'https://0chiel-backend-production.up.railway.app/api';

    const bg = currentSpace === 'matter' ? '#fff' : '#0a0a0a';
    const fg = currentSpace === 'matter' ? '#111' : '#f0f0f0';
    const border = currentSpace === 'matter' ? '#ddd' : '#222';
    const placeholder = currentSpace === 'matter' ? '#aaa' : '#555';

    const handleLogin = async () => {
        if (!password.trim()) {
            setError('Password required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('ochiel_session', data.sessionId);
                onLogin(data.sessionId);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <View style={[styles.modal, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[styles.title, { color: fg }]}>admin login</Text>
                
                <View style={[styles.usernameDisplay, { borderColor: border }]}>
                    <Text style={[styles.usernameText, { color: fg }]}>robert</Text>
                </View>
                
                <TextInput
                    style={[styles.input, { color: fg, borderColor: border }]}
                    placeholder="password"
                    placeholderTextColor={placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoFocus
                />
                
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
                                backgroundColor: password.trim() && !loading ? '#f4e4a6' : 'transparent',
                                opacity: password.trim() ? 1 : 0.5
                            }
                        ]}
                        onPress={handleLogin}
                        disabled={loading || !password.trim()}
                    >
                        <Text style={[
                            styles.buttonText, 
                            { color: password.trim() && !loading ? '#000' : fg }
                        ]}>
                            {loading ? 'logging in...' : 'login →'}
                        </Text>
                    </TouchableOpacity>
                </View>
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
    input: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        marginBottom: 12,
    },
    usernameDisplay: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        marginBottom: 12,
        backgroundColor: 'rgba(100,100,100,0.1)',
        alignItems: 'center',
    },
    usernameText: {
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
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
    registerButton: {
        width: '100%',
    },
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