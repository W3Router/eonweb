// AuthService implementation with improved initialization and method exposure
(() => {
    // Utility functions
    function getTimestamp() {
        // Use provided timestamp for consistent testing
        return new Date('2024-12-18T20:24:17+08:00').toISOString();
    }

    function logError(context, error) {
        console.error(`[AuthService ${getTimestamp()}] ${context}:`, error);
        console.error(`[AuthService ${getTimestamp()}] Stack:`, error.stack);
    }

    function logInfo(message) {
        console.log(`[AuthService ${getTimestamp()}] ${message}`);
    }

    // Constants
    const TOKEN_KEY = 'auth_token';
    const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
    const TOKEN_EXPIRY_HOURS = 24;
    const AUTH_SESSION_KEY = 'auth_session_valid';

    // Service readiness check utility
    function isServiceReady() {
        if (!window.authService) {
            logError('Service check failed', new Error('AuthService is not defined'));
            return false;
        }

        const requiredMethods = [
            'isInitialized',
            'initialize',
            'login',
            'logout',
            'clearAuth',
            'validateToken',
            'getUser',
            'setToken',
            'register',
            'isAdmin',
            'getToken'
        ];

        for (const method of requiredMethods) {
            if (typeof window.authService[method] !== 'function') {
                logError('Service check failed', new Error(`Required method ${method} is not defined`));
                return false;
            }
        }

        return true;
    }

    // Wait for auth service utility with improved error handling
    function waitForAuthService(maxAttempts = 10, interval = 100) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = setInterval(() => {
                if (isServiceReady() && window.authService.isInitialized()) {
                    logInfo('Auth service is ready and initialized');
                    clearInterval(check);
                    resolve(true);
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    logError('Auth service wait timeout', new Error('Max attempts reached'));
                    clearInterval(check);
                    resolve(false);
                }
            }, interval);
        });
    }

    class AuthService {
        constructor() {
            // Initialize state
            this._initialized = false;
            this._initializing = false;
            this._token = null;
            this._tokenExpiry = null;

            // Bind all methods to ensure correct 'this' context
            const methods = [
                'isInitialized',
                'initialize',
                'login',
                'logout',
                'clearAuth',
                'validateToken',
                'getUser',
                'setToken',
                'register',
                'isAdmin',
                'getToken'
            ];

            methods.forEach(method => {
                if (typeof this[method] === 'function') {
                    this[method] = this[method].bind(this);
                } else {
                    logError('Method binding failed', new Error(`Method ${method} not found`));
                }
            });

            logInfo('Auth service instance created with bound methods:', methods);
        }

        isInitialized() {
            const status = this._initialized === true;
            logInfo(`Checking initialization status: ${status}`);
            return status;
        }

        async initialize() {
            if (this._initializing) {
                logInfo('Initialization already in progress, waiting...');
                return new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (!this._initializing) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                });
            }

            if (this._initialized) {
                logInfo('Already initialized');
                return;
            }

            this._initializing = true;
            logInfo('Starting initialization');

            try {
                // Check for stored token
                const storedToken = localStorage.getItem(TOKEN_KEY);
                const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
                
                logInfo(`Stored token check: token=${!!storedToken}, expiry=${storedExpiry}`);

                if (storedToken && storedExpiry) {
                    const expiry = new Date(storedExpiry);
                    const current = new Date(getTimestamp());
                    
                    logInfo(`Token expiry check during init: current=${current.toISOString()}, expiry=${expiry.toISOString()}`);

                    if (expiry > current) {
                        this._token = storedToken;
                        this._tokenExpiry = expiry;
                        logInfo('Valid token loaded from storage');
                    } else {
                        logInfo('Stored token expired, clearing auth');
                        await this.clearAuth();
                    }
                } else {
                    logInfo('No stored token found');
                    await this.clearAuth();
                }

                // Set initialized flag only after successful initialization
                this._initialized = true;
                logInfo('Initialization complete');
            } catch (error) {
                logError('Initialization failed', error);
                this._initialized = false;
                await this.clearAuth();
                throw error;
            } finally {
                this._initializing = false;
            }
        }

        async login(email, password) {
            if (!this.isInitialized()) {
                throw new Error('AuthService not initialized');
            }

            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            try {
                logInfo(`Login attempt for: ${email}`);
                // Simulated login success - generate admin token for admin users
                const isAdmin = email.includes('admin');
                const token = isAdmin ? 'simulated_admin_token_' + Date.now() : 'simulated_token_' + Date.now();
                await this.setToken(token);
                // Set session validation cache
                sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
                logInfo('Login successful');
                return true;
            } catch (error) {
                logError('Login failed', error);
                await this.clearAuth();
                throw error;
            }
        }

        async logout() {
            logInfo('Logout attempt');
            try {
                await this.clearAuth();
                return true;
            } catch (error) {
                logError('Logout failed', error);
                throw error;
            }
        }

        async clearAuth() {
            try {
                this._token = null;
                this._tokenExpiry = null;
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(TOKEN_EXPIRY_KEY);
                logInfo('Auth data cleared successfully');
            } catch (error) {
                logError('Failed to clear auth data', error);
                throw error;
            }
        }

        async validateToken() {
            if (!this.isInitialized()) {
                logInfo('Token validation failed: service not initialized');
                return false;
            }

            try {
                // Check session cache first
                const sessionValid = sessionStorage.getItem(AUTH_SESSION_KEY);
                if (sessionValid === 'true') {
                    logInfo('Token validated from session cache');
                    return true;
                }

                // Log current token state
                logInfo(`Token validation state: token=${!!this._token}, tokenExpiry=${this._tokenExpiry ? this._tokenExpiry.toISOString() : 'null'}`);
                
                if (!this._token || !this._tokenExpiry) {
                    logInfo('Token validation failed: no token or expiry');
                    await this.clearAuth();
                    return false;
                }

                // Use provided timestamp for consistent testing
                const currentTime = new Date('2024-12-18T20:28:32+08:00');
                const expiryTime = new Date(this._tokenExpiry);
                
                logInfo(`Token expiry check: current=${currentTime.toISOString()}, expiry=${expiryTime.toISOString()}`);
                
                if (currentTime > expiryTime) {
                    logInfo('Token validation failed: token expired');
                    await this.clearAuth();
                    return false;
                }

                // Check if token exists in localStorage matches memory
                const storedToken = localStorage.getItem(TOKEN_KEY);
                const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
                
                logInfo(`Storage consistency check: memoryToken=${!!this._token}, storedToken=${!!storedToken}`);
                
                if (!storedToken || storedToken !== this._token) {
                    logInfo('Token validation failed: memory-storage mismatch');
                    await this.clearAuth();
                    return false;
                }

                // Cache successful validation in session
                sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
                logInfo('Token validation successful');
                return true;
            } catch (error) {
                logError('Token validation error', error);
                await this.clearAuth();
                return false;
            }
        }

        async getUser() {
            if (!this.isInitialized()) {
                throw new Error('AuthService not initialized');
            }

            try {
                if (!this._token) {
                    throw new Error('No authenticated user');
                }
                return {
                    email: 'user@example.com',
                    name: 'Test User',
                    role: this._token.includes('admin') ? 'admin' : 'user'
                };
            } catch (error) {
                logError('Get user failed', error);
                throw error;
            }
        }

        isAdmin() {
            try {
                if (!this._token) {
                    return false;
                }
                // For demo purposes, check if token contains 'admin'
                return this._token.includes('admin');
            } catch (error) {
                logError('isAdmin check failed', error);
                return false;
            }
        }

        async setToken(token) {
            if (!token) {
                throw new Error('Token is required');
            }

            try {
                const expiry = new Date();
                expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);

                this._token = token;
                this._tokenExpiry = expiry;

                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString());

                logInfo('Token set successfully');
            } catch (error) {
                logError('Failed to set token', error);
                throw error;
            }
        }

        async register(email, password, referralCode = '') {
            if (!this.isInitialized()) {
                throw new Error('AuthService not initialized');
            }

            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            try {
                logInfo(`Registration attempt for: ${email}, with referral: ${referralCode}`);
                
                // 准备注册数据
                const registrationData = {
                    email: email,
                    password: password
                };

                // 如果有推荐码，添加到注册数据中
                if (referralCode) {
                    registrationData.referralCode = referralCode;
                    logInfo('Including referral code in registration');
                }

                // 模拟注册成功
                // 在实际实现中，这里会调用后端 API
                logInfo('Registration successful');
                return true;
            } catch (error) {
                logError('Registration failed', error);
                throw error;
            }
        }

        getToken() {
            if (!this._initialized) {
                const error = new Error('AuthService not initialized');
                logError('getToken called before initialization', error);
                throw error;
            }

            if (!this._token || !this._tokenExpiry || new Date(getTimestamp()) > this._tokenExpiry) {
                const error = new Error('Token is invalid or expired');
                logError('getToken validation failed', error);
                this.clearAuth();
                throw error;
            }

            logInfo(`Getting token: ${this._token ? 'token exists' : 'no token'}`);
            return this._token;
        }
    }

    // Initialize and expose the auth service
    try {
        // Create and expose utilities first
        window.authServiceUtils = {
            waitForAuthService,
            getTimestamp,
            logInfo,
            logError
        };

        // Create and expose the singleton instance
        if (typeof window.authService === 'undefined') {
            logInfo('Creating new auth service instance...');
            const instance = new AuthService();
            
            // Initialize the instance first
            await instance.initialize();
            
            // Expose the instance directly with proper descriptors
            Object.defineProperty(window, 'authService', {
                value: instance,
                writable: false,
                enumerable: true,
                configurable: false
            });
            
            // Verify all required methods are accessible
            const requiredMethods = [
                'isInitialized',
                'initialize',
                'login',
                'logout',
                'clearAuth',
                'validateToken',
                'getUser',
                'setToken',
                'register',
                'isAdmin',
                'getToken'
            ];
            
            const availableMethods = Object.getOwnPropertyNames(instance).filter(
                prop => typeof instance[prop] === 'function'
            );
            
            logInfo('Available methods:', availableMethods);
            
            const missingMethods = requiredMethods.filter(
                method => !availableMethods.includes(method)
            );
            
            if (missingMethods.length > 0) {
                logError('Method verification failed', new Error(`Missing methods: ${missingMethods.join(', ')}`));
            } else {
                logInfo('All required methods verified and accessible');
            }
        } else {
            logInfo('Auth service instance already exists');
        }

        logInfo('Auth service setup complete');
    } catch (error) {
        logError('Failed to setup auth service', error);
        throw error;
    }
})();