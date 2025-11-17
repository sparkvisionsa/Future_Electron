import React, { useState } from 'react';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        otp: ''
    });
    const [showOtp, setShowOtp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            if (!showOtp) {
                // First stage: Email + Password
                console.log('Submitting credentials:', {
                    email: formData.email,
                    password: formData.password
                });

                // ✅ REAL ELECTRON API CALL
                if (window.electronAPI && window.electronAPI.login) {
                    const result = await window.electronAPI.login({
                        email: formData.email,
                        password: formData.password
                    });

                    console.log('Login result:', result);

                    if (result.status === 'OTP_REQUIRED') {
                        setShowOtp(true);
                        setMessage({
                            text: result.message || 'Two-factor authentication required. Please enter your OTP.',
                            type: 'info'
                        });
                    } else if (result.status === 'SUCCESS') {
                        setMessage({
                            text: result.message || '✅ Login successful! Starting automation...',
                            type: 'success'
                        });
                    } else {
                        throw new Error(result.error || 'Login failed');
                    }
                } else {
                    throw new Error('Electron API not available');
                }
            } else {
                // Second stage: OTP
                console.log('Submitting OTP:', formData.otp);

                // ✅ REAL ELECTRON API CALL FOR OTP
                if (window.electronAPI && window.electronAPI.submitOtp) {
                    const result = await window.electronAPI.submitOtp(formData.otp);

                    console.log('OTP result:', result);

                    if (result.status === 'SUCCESS') {
                        setMessage({
                            text: result.message || '✅ Authentication complete! Automation running...',
                            type: 'success'
                        });

                        // Automation is now running in Python
                    } else {
                        throw new Error(result.error || 'OTP verification failed');
                    }
                } else {
                    throw new Error('Electron API not available');
                }
            }
        } catch (error) {
            setMessage({
                text: '❌ Error: ' + error.message,
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };
    // Reset form
    const handleReset = () => {
        setFormData({ email: '', password: '', otp: '' });
        setShowOtp(false);
        setMessage({ text: '', type: '' });
    };

    return (
        <div className="login-form-container">
            <form onSubmit={handleSubmit} className="login-form">
                {/* Email Field */}
                <div className="form-group">
                    <label htmlFor="email" className="form-label">
                        📧 Email Address
                    </label>
                    <input
                        type="text"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={showOtp || isLoading}
                        placeholder="Enter your email"
                        className="form-input"
                        required
                    />
                </div>

                {/* Password Field */}
                <div className="form-group">
                    <label htmlFor="password" className="form-label">
                        🔒 Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        disabled={showOtp || isLoading}
                        placeholder="Enter your password"
                        className="form-input"
                        required
                    />
                </div>

                {/* Conditional OTP Field */}
                {showOtp && (
                    <div className="form-group">
                        <label htmlFor="otp" className="form-label">
                            🔑 One-Time Password
                        </label>
                        <input
                            type="text"
                            id="otp"
                            name="otp"
                            value={formData.otp}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            placeholder="Enter 6-digit OTP"
                            className="form-input"
                            maxLength="6"
                            pattern="[0-9]{6}"
                            required
                        />
                        <small className="form-hint">
                            Check your authenticator app for the code
                        </small>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="form-actions">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`btn-primary ${isLoading ? 'loading' : ''}`}
                    >
                        {isLoading ? (
                            <span className="loading-text">⏳ Processing...</span>
                        ) : showOtp ? (
                            'Verify OTP'
                        ) : (
                            'Login & Start Automation'
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isLoading}
                        className="btn-secondary"
                    >
                        Reset Form
                    </button>
                </div>

                {/* Status Message */}
                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Progress Indicator */}
                <div className="progress-steps">
                    <div className={`step ${!showOtp ? 'active' : 'completed'}`}>
                        <span className="step-number">1</span>
                        <span className="step-text">Credentials</span>
                    </div>
                    <div className={`step ${showOtp ? 'active' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-text">Verification</span>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default LoginForm;