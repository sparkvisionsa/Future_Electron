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

                if (window.electronAPI && window.electronAPI.submitOtp) {
                    const result = await window.electronAPI.submitOtp(formData.otp);

                    console.log('OTP result:', result);

                    if (result.status === 'SUCCESS') {
                        setMessage({
                            text: result.message || '✅ Authentication complete! Automation running...',
                            type: 'success'
                        });
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

    const handleReset = () => {
        setFormData({ email: '', password: '', otp: '' });
        setShowOtp(false);
        setMessage({ text: '', type: '' });
    };

    const getMessageStyles = (type) => {
        const baseStyles = "p-4 rounded-lg border";
        switch (type) {
            case 'success':
                return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
            case 'error':
                return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
            case 'info':
                return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
            default:
                return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
        }
    };

    return (
        <div className="max-w-md w-full mx-auto py-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    {/* Conditional OTP Field */}
                    {showOtp && (
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                maxLength="6"
                                pattern="[0-9]{6}"
                                required
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Check your authenticator app for the code
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
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
                            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Status Message */}
                    {message.text && (
                        <div className={getMessageStyles(message.type)}>
                            {message.text}
                        </div>
                    )}

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center space-x-8 pt-4">
                        <div className={`flex items-center space-x-2 ${!showOtp ? 'text-blue-600' : 'text-green-600'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${!showOtp ? 'border-blue-600 bg-blue-600 text-white' : 'border-green-600 bg-green-600 text-white'
                                }`}>
                                1
                            </div>
                            <span className="text-sm font-medium">Credentials</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-300"></div>
                        <div className={`flex items-center space-x-2 ${showOtp ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${showOtp ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                                }`}>
                                2
                            </div>
                            <span className="text-sm font-medium">Verification</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;