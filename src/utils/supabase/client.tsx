import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// API base URL for our server functions
export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-206208a7`;

// Helper function to make authenticated API calls
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    // Check if we're in demo mode first
    const demoSession = localStorage.getItem('demo_session');
    
    if (demoSession) {
      // In demo mode, return demo data for certain endpoints
      return handleDemoApiCall(endpoint, options);
    }
    
    // Try to get real session
    let authToken;
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 1000);
      authToken = session?.access_token || publicAnonKey;
    } catch (error) {
      // If session check fails, use anon key
      authToken = publicAnonKey;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...options.headers,
    };

    // Add timeout to fetch request - reduced for faster response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.debug(`API call failed: ${endpoint} - Status: ${response.status}`);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.debug(`Backend unavailable for ${endpoint}:`, error);
    throw error;
  }
}

// Handle demo API calls with mock data
function handleDemoApiCall(endpoint: string, options: RequestInit = {}) {
  return new Promise((resolve, reject) => {
    // Reduced simulated delay for faster response
    setTimeout(() => {
      try {
        // Handle different endpoints
        if (endpoint.includes('/nearby-requests/')) {
          const userId = endpoint.split('/nearby-requests/')[1];
          const demoProfile = localStorage.getItem('demo_profile');
          
          if (demoProfile) {
            const profile = JSON.parse(demoProfile);
            // Return demo blood requests matching the user's blood type
            resolve({
              requests: generateDemoBloodRequests(profile.bloodType || 'O+')
            });
          } else {
            resolve({ requests: [] });
          }
        } else if (endpoint.includes('/notifications/')) {
          const userId = endpoint.split('/notifications/')[1];
          
          // Handle read notification requests
          if (endpoint.includes('/read') && options.method === 'PUT') {
            resolve({ success: true });
          } else {
            resolve({
              notifications: generateDemoNotifications(userId)
            });
          }
        } else if (endpoint === '/profile') {
          const demoProfile = localStorage.getItem('demo_profile');
          if (demoProfile) {
            resolve({ profile: JSON.parse(demoProfile) });
          } else {
            reject(new Error('Demo profile not found'));
          }
        } else if (endpoint === '/accept-blood-request') {
          // Simulate successful blood request acceptance
          resolve({
            success: true,
            message: 'Blood request accepted successfully'
          });
        } else {
          // Default response for unknown endpoints
          resolve({ success: true, data: [] });
        }
      } catch (error) {
        reject(error);
      }
    }, 200 + Math.random() * 300); // 200-500ms delay (reduced from 500-1500ms)
  });
}

// Generate demo blood requests
function generateDemoBloodRequests(userBloodType: string) {
  const now = new Date();
  return [
    {
      id: "BR-2024-001",
      bloodType: userBloodType,
      units: 2,
      urgency: "Critical",
      hospital: "AIIMS Delhi",
      hospitalType: "Government Hospital",
      address: "Ansari Nagar, New Delhi, Delhi 110029",
      contactEmail: "emergency@aiims.edu",
      contactPhone: "+91-11-2658-8500",
      reason: "Emergency surgery - motor vehicle accident",
      patientAge: "34",
      patientGender: "Male",
      requestedDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      requiredBy: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      status: "Active",
      coordinates: { lat: 28.5672, lng: 77.2100 },
      distance: 2.3,
      state: "Delhi"
    },
    {
      id: "BR-2024-002",
      bloodType: userBloodType,
      units: 1,
      urgency: "High",
      hospital: "Apollo Hospital",
      hospitalType: "Private Hospital",
      address: "Sarita Vihar, New Delhi, Delhi 110076",
      contactEmail: "bloodbank@apollodelhi.com",
      contactPhone: "+91-11-2692-5858",
      reason: "Scheduled surgery - cardiac procedure",
      patientAge: "67",
      patientGender: "Female",
      requestedDate: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      requiredBy: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: "Active",
      coordinates: { lat: 28.5355, lng: 77.2636 },
      distance: 4.7,
      state: "Delhi"
    }
  ];
}

// Generate demo notifications
function generateDemoNotifications(userId: string) {
  const now = new Date();
  return [
    {
      id: `notif-${userId}-001`,
      userId: userId,
      type: "blood_request",
      title: "🩸 Critical Blood Request Near You",
      message: "O+ blood urgently needed at Mount Sinai Hospital - 2 units required for emergency surgery",
      bloodRequestId: "BR-2024-001",
      distance: 2.3,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      urgency: "Critical"
    },
    {
      id: `notif-${userId}-002`,
      userId: userId,
      type: "system",
      title: "Donation Eligibility Reminder",
      message: "You're eligible to donate blood again! Your last donation was over 8 weeks ago.",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      urgency: "Low"
    }
  ];
}

// Helper function for timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Fallback demo data for offline mode - unified user approach
const DEMO_USERS = {
  'donor@demo.com': {
    password: 'Demo123!',
    profile: {
      id: '7f4c7fad-549f-4efa-8ad2-d716f0c5a155',
      userId: '7f4c7fad-549f-4efa-8ad2-d716f0c5a155',
      email: 'donor@demo.com',
      fullName: 'John Smith',
      role: 'user' as const,
      bloodType: 'O+',
      location: 'New York, NY',
      phoneNumber: '(555) 123-4567',
      dateOfBirth: '1990-05-15',
      city: 'New York',
      state: 'New York',
      createdAt: '2024-01-01T00:00:00Z',
      isAvailable: true,
      coordinates: { lat: 40.7128, lng: -74.0060 }
    }
  },
  'patient@demo.com': {
    password: 'Demo123!',
    profile: {
      id: 'b8e9c2f1-456a-4b7c-9d8e-f1a2b3c4d5e6',
      userId: 'b8e9c2f1-456a-4b7c-9d8e-f1a2b3c4d5e6',
      email: 'patient@demo.com',
      fullName: 'Jane Williams',
      role: 'user' as const,
      bloodType: 'A+',
      location: 'Los Angeles, CA',
      phoneNumber: '(555) 987-6543',
      dateOfBirth: '1985-08-22',
      city: 'Los Angeles',
      state: 'California',
      createdAt: '2024-01-01T00:00:00Z',
      coordinates: { lat: 34.0522, lng: -118.2437 }
    }
  },
  'hospital@demo.com': {
    password: 'Demo123!',
    profile: {
      id: 'c9f0d3e2-567b-5c8d-ae9f-02b3c4d5e6f7',
      userId: 'c9f0d3e2-567b-5c8d-ae9f-02b3c4d5e6f7',
      email: 'hospital@demo.com',
      fullName: 'Dr. Sarah Johnson',
      role: 'user' as const,
      bloodType: 'B+',
      location: 'Chicago, IL',
      phoneNumber: '(555) 456-7890',
      dateOfBirth: '1980-12-10',
      city: 'Chicago',
      state: 'Illinois',
      createdAt: '2024-01-01T00:00:00Z',
      coordinates: { lat: 41.8781, lng: -87.6298 }
    }
  }
};

// Global flag to check if we're in demo mode
let isDemoMode = false;

// Check if we're currently in demo mode
function checkDemoMode(): boolean {
  return isDemoMode || localStorage.getItem('demo_session') !== null;
}

// Set demo mode
function setDemoMode(enabled: boolean) {
  isDemoMode = enabled;
  if (enabled) {
    console.log('🔧 Demo mode enabled - using offline functionality');
  }
}

// Fallback authentication for demo mode
function demoAuth(email: string, password: string) {
  const user = DEMO_USERS[email as keyof typeof DEMO_USERS];
  if (user && user.password === password) {
    const session = {
      access_token: `demo_token_${Date.now()}`,
      refresh_token: `demo_refresh_${Date.now()}`,
      user: { id: user.profile.id, email: user.profile.email }
    };
    localStorage.setItem('demo_session', JSON.stringify(session));
    localStorage.setItem('demo_profile', JSON.stringify(user.profile));
    setDemoMode(true);
    return { session, user: session.user };
  }
  throw new Error('Invalid demo credentials');
}

// Quick network connectivity check
async function quickConnectivityCheck(): Promise<boolean> {
  try {
    // Quick 1-second timeout check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    try {
      // Use our custom signup endpoint that stores additional profile data
      return await withTimeout(
        apiCall('/signup', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            ...userData
          }),
        }),
        15000 // 15 second timeout for signup
      );
    } catch (error: any) {
      console.error('SignUp error:', error);
      throw new Error(error.message || 'Failed to create account. Please check your connection and try again.');
    }
  },

  signIn: async (email: string, password: string) => {
    // First, try demo authentication for known demo accounts
    if (email in DEMO_USERS) {
      console.log('🎯 Demo account detected, using offline mode');
      try {
        return demoAuth(email, password);
      } catch (demoError: any) {
        throw new Error('Incorrect password for demo account. Please use: Demo123!');
      }
    }

    // For non-demo accounts, try backend authentication with graceful fallback
    try {
      // First check connectivity with a shorter timeout
      const isConnected = await quickConnectivityCheck();
      
      if (isConnected) {
        // Try normal Supabase authentication
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          5000 // 5 second timeout
        );
        
        if (error) {
          console.error('SignIn error:', error);
          
          if (error.message?.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials.');
          }
          
          throw error;
        }
        return data;
      } else {
        // Network is down - suggest demo accounts
        throw new Error('Unable to connect to servers. Please try demo accounts for offline access.');
      }
    } catch (error: any) {
      console.error('SignIn error:', error);
      
      // Handle different error scenarios more gracefully
      if (error.message?.includes('Invalid login credentials') || 
          error.message?.includes('Invalid email or password')) {
        throw new Error('Invalid email or password. Please check your credentials or try demo accounts for offline access.');
      }
      
      if (error.message?.includes('Unable to connect') || 
          error.message?.includes('No internet') ||
          error.message?.includes('Network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to servers. Use demo accounts to explore offline features.');
      }
      
      // Generic network error - suggest demo accounts
      throw new Error('Connection issue detected. Try demo accounts to explore offline features.');
    }
  },

  signOut: async () => {
    try {
      const { error } = await withTimeout(supabase.auth.signOut(), 5000);
      if (error) throw error;
    } catch (error: any) {
      console.error('SignOut error:', error);
      // Don't throw on signout errors, just log them
    } finally {
      // Always clear demo data on signout
      localStorage.removeItem('demo_session');
      localStorage.removeItem('demo_profile');
    }
  },

  getSession: async () => {
    // Check demo mode first
    const demoSession = localStorage.getItem('demo_session');
    if (demoSession) {
      console.log('🎯 Using demo session');
      setDemoMode(true);
      return JSON.parse(demoSession);
    }

    // If we're in demo mode but no session, return null
    if (checkDemoMode()) {
      return null;
    }

    try {
      const { data: { session }, error } = await withTimeout(
        supabase.auth.getSession(),
        1000 // Very short timeout for session check
      );
      if (error) throw error;
      return session;
    } catch (error: any) {
      console.error('GetSession error:', error);
      // Don't throw on session errors, just return null
      return null;
    }
  },

  getUser: async () => {
    try {
      const { data: { user }, error } = await withTimeout(
        supabase.auth.getUser(),
        5000
      );
      if (error) throw error;
      return user;
    } catch (error: any) {
      console.error('GetUser error:', error);
      throw error;
    }
  }
};

// Profile helper functions
export const profile = {
  get: async () => {
    // Check demo mode first
    const demoProfile = localStorage.getItem('demo_profile');
    if (demoProfile) {
      console.log('🎯 Using demo profile');
      setDemoMode(true);
      return { profile: JSON.parse(demoProfile) };
    }

    // If we're in demo mode but no profile, return error
    if (checkDemoMode()) {
      throw new Error('Demo profile not found');
    }

    try {
      return await withTimeout(apiCall('/profile'), 5000);
    } catch (error: any) {
      console.error('Profile get error:', error);
      
      if (error.message?.includes('timeout') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('Network') ||
          error.message?.includes('aborted')) {
        throw new Error('Network error while fetching profile. Please sign in again or use demo accounts.');
      }
      throw error;
    }
  },

  update: async (profileData: any) => {
    try {
      return await withTimeout(
        apiCall('/profile', {
          method: 'PUT',
          body: JSON.stringify(profileData),
        }),
        10000
      );
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (error.message?.includes('timeout')) {
        throw new Error('Profile update timeout. Please try again.');
      }
      throw error;
    }
  }
};

// Donor helper functions
export const donors = {
  search: async (bloodType?: string, location?: string) => {
    const params = new URLSearchParams();
    if (bloodType) params.set('bloodType', bloodType);
    if (location) params.set('location', location);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/donors${query}`);
  },

  updateAvailability: async (isAvailable: boolean) => {
    return apiCall('/availability', {
      method: 'PUT',
      body: JSON.stringify({ isAvailable }),
    });
  }
};

// Blood request helper functions
export const bloodRequests = {
  create: async (requestData: any) => {
    return apiCall('/blood-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  getAll: async () => {
    return apiCall('/blood-requests');
  }
};

// Email verification helper functions
export const emailVerification = {
  sendOTP: async (email: string, purpose: 'registration' | 'password-reset' = 'registration') => {
    try {
      // Simulate sending OTP via email service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, this would call your email service API
      console.log(`📧 OTP sent to ${email} for ${purpose}`);
      
      // For demo purposes, always return success
      return { 
        success: true, 
        message: 'Verification code sent successfully',
        expiresIn: 600 // 10 minutes
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send verification code');
    }
  },

  verifyOTP: async (email: string, otp: string, purpose: 'registration' | 'password-reset' = 'registration') => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept specific codes
      const validOTPs = ['123456', '000000'];
      
      if (validOTPs.includes(otp)) {
        console.log(`✅ OTP verification successful for ${email}`);
        return { 
          success: true, 
          message: 'Email verified successfully',
          verificationToken: `verify_${Date.now()}_${email}` // Demo token
        };
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  },

  resendOTP: async (email: string, purpose: 'registration' | 'password-reset' = 'registration') => {
    return emailVerification.sendOTP(email, purpose);
  }
};

// Password reset helper functions
export const passwordReset = {
  requestReset: async (email: string) => {
    try {
      // Check if email exists (demo mode)
      const demoEmails = Object.keys(DEMO_USERS);
      const emailExists = demoEmails.includes(email) || email.includes('@'); // Basic check for demo
      
      if (!emailExists) {
        throw new Error('Email address not found');
      }

      // Send OTP for password reset
      return await emailVerification.sendOTP(email, 'password-reset');
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  },

  verifyResetOTP: async (email: string, otp: string) => {
    return await emailVerification.verifyOTP(email, otp, 'password-reset');
  },

  updatePassword: async (email: string, newPassword: string, verificationToken?: string) => {
    try {
      // Simulate password update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`🔒 Password updated for ${email}`);
      
      // In production, this would update the password in your database
      return { 
        success: true, 
        message: 'Password updated successfully' 
      };
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Failed to update password');
    }
  }
};