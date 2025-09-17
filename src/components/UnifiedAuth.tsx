import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Heart, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, User } from "lucide-react";
import { EmailVerification } from "./EmailVerification";
import { PasswordReset } from "./PasswordReset";
import { auth } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface UnifiedAuthProps {
  onNavigateToHome: () => void;
  onAuthSuccess: () => void;
}

type AuthStep = 'main' | 'email-verification' | 'password-reset';

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"
];

export function UnifiedAuth({ onNavigateToHome, onAuthSuccess }: UnifiedAuthProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('main');
  const [activeTab, setActiveTab] = useState("signin");
  const [pendingRegistrationData, setPendingRegistrationData] = useState<any>(null);
  
  // Sign In Form
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
    stayLoggedIn: false
  });
  
  // Registration Form
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    bloodType: "",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
    agreedToPrivacy: false
  });

  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignInInputChange = (field: string, value: any) => {
    setSignInForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegisterInputChange = (field: string, value: any) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
  };

  const validatePasswordStrength = (password: string): boolean => {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /\d/.test(password) &&
           /[!@#$%^&*(),.?\":{}|<>]/.test(password);
  };

  const getPasswordStrengthColor = (password: string): string => {
    if (!password) return 'bg-gray-200';
    if (password.length < 8) return 'bg-red-400';
    if (!validatePasswordStrength(password)) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getPasswordStrengthText = (password: string): string => {
    if (!password) return 'Password required';
    if (password.length < 8) return 'Too short (minimum 8 characters)';
    if (!validatePasswordStrength(password)) return 'Good (add symbols for strong)';
    return 'Strong password';
  };

  const validateRegisterForm = () => {
    const required = ['fullName', 'email', 'phone', 'dateOfBirth', 'bloodType', 'city', 'state', 'password', 'confirmPassword'];
    const hasAllFields = required.every(field => registerForm[field as keyof typeof registerForm]);
    const passwordsMatch = registerForm.password === registerForm.confirmPassword;
    const passwordStrong = validatePasswordStrength(registerForm.password);
    return hasAllFields && passwordsMatch && passwordStrong && registerForm.agreedToTerms && registerForm.agreedToPrivacy;
  };

  const handleForgotPassword = () => {
    setCurrentStep('password-reset');
  };

  const handleDemoAccountSelect = (email: string, userType: string) => {
    setError(null); // Clear any existing errors
    handleSignInInputChange('email', email);
    handleSignInInputChange('password', 'Demo123!');
    setActiveTab('signin');
    toast.success(`${userType} demo account loaded! Click Sign In to continue offline.`, { 
      duration: 3000 
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Sign in with auth service (handles demo mode automatically)
      const { session } = await auth.signIn(signInForm.email, signInForm.password);
      
      if (!session) {
        throw new Error('Failed to create session');
      }

      // Handle stay logged in option (only for real accounts, not demo)
      const isDemoAccount = signInForm.email.includes('@demo.com');
      if (signInForm.stayLoggedIn && !isDemoAccount) {
        localStorage.setItem('bloodconnect_stay_logged_in', 'true');
        localStorage.setItem('bloodconnect_session_token', session.access_token);
      } else {
        localStorage.removeItem('bloodconnect_stay_logged_in');
        localStorage.removeItem('bloodconnect_session_token');
      }

      console.log('Sign-in successful');
      
      if (isDemoAccount) {
        toast.success('Welcome to BloodConnect Demo!');
      } else {
        toast.success('Welcome back to BloodConnect!');
      }
      
      onAuthSuccess();
    } catch (error: any) {
      console.error('Sign-in error:', error);
      
      // The auth service already provides formatted error messages with demo account info
      setError(error.message);
      
      // Show different toast based on error type
      if (error.message?.includes('Cannot connect') || 
          error.message?.includes('Connection issue') ||
          error.message?.includes('Unable to connect') ||
          error.message?.includes('offline')) {
        toast.error('Network unavailable. Use demo accounts above for offline access.', {
          duration: 5000
        });
      } else if (error.message?.includes('Incorrect password for demo')) {
        toast.error('Demo account password is: Demo123!', {
          duration: 4000
        });
      } else {
        toast.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare user data - no role assignment during registration
      const userData = {
        email: registerForm.email,
        password: registerForm.password,
        fullName: registerForm.fullName,
        role: 'user', // Generic role - user can choose later
        phoneNumber: registerForm.phone,
        location: `${registerForm.city}, ${registerForm.state}`,
        bloodType: registerForm.bloodType,
        dateOfBirth: registerForm.dateOfBirth
      };

      // Store registration data for after email verification
      setPendingRegistrationData(userData);

      console.log('Registration data prepared, proceeding to email verification');
      toast.success('Registration data ready! Please verify your email to continue.');
      
      setCurrentStep('email-verification');
      
    } catch (error: any) {
      console.error('Registration preparation error:', error);
      setError('Failed to prepare registration. Please try again.');
      toast.error('Registration preparation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailVerificationSuccess = async () => {
    if (!pendingRegistrationData) {
      toast.error('Registration data not found. Please try registering again.');
      setCurrentStep('main');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Call our custom signup endpoint
      const result = await auth.signUp(
        pendingRegistrationData.email, 
        pendingRegistrationData.password, 
        pendingRegistrationData
      );
      
      console.log('Registration successful:', result);
      toast.success('Registration successful! Welcome to BloodConnect.');
      
      setSubmitSuccess(true);
      
      // Auto-redirect after success message
      setTimeout(() => {
        onAuthSuccess();
      }, 2000);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message?.includes('User already registered') || error.message?.includes('already exists')) {
        errorMessage = 'An account with this email already exists. Please try signing in instead.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('Password')) {
        errorMessage = 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special characters.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setCurrentStep('main'); // Go back to main registration form
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetComplete = () => {
    setCurrentStep('main');
    setActiveTab('signin');
    toast.success('You can now sign in with your new password!');
  };

  const isValidSignIn = signInForm.email && signInForm.password;

  // Email verification step
  if (currentStep === 'email-verification' && pendingRegistrationData) {
    return (
      <EmailVerification
        email={pendingRegistrationData.email}
        onVerificationSuccess={handleEmailVerificationSuccess}
        onNavigateBack={() => setCurrentStep('main')}
        userType="new-user"
        title="Verify Your Email"
        description="Please verify your email address to complete your BloodConnect registration and secure your account."
      />
    );
  }

  // Password reset step
  if (currentStep === 'password-reset') {
    return (
      <PasswordReset
        onNavigateBack={() => setCurrentStep('main')}
        onResetComplete={handlePasswordResetComplete}
      />
    );
  }

  if (submitSuccess) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to BloodConnect!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. You can now start saving lives by donating blood or requesting blood for those in need.
            </p>
            <Button 
              onClick={onAuthSuccess}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onNavigateToHome}
            className="text-gray-600 hover:text-gray-900 p-0 h-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Join BloodConnect</CardTitle>
            <CardDescription>
              One platform to donate blood and help save lives in your community
            </CardDescription>
            
            {/* Demo Account Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-sm text-blue-700 font-medium">
                  🚀 Try Demo Accounts (No Internet Required)
                </p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect('donor@demo.com', 'Blood Donor')}
                  className="w-full text-left p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-xs text-blue-700">
                    <strong>🩸 Blood Donor:</strong> donor@demo.com
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect('patient@demo.com', 'Blood Recipient')}
                  className="w-full text-left p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-xs text-blue-700">
                    <strong>🏥 Blood Recipient:</strong> patient@demo.com
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect('hospital@demo.com', 'Healthcare Provider')}
                  className="w-full text-left p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-xs text-blue-700">
                    <strong>🩺 Healthcare Provider:</strong> hospital@demo.com
                  </div>
                </button>
                <div className="text-center mt-2">
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    Password: Demo123!
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="flex items-center gap-2 py-3">
                  <User className="w-4 h-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2 py-3">
                  <Heart className="w-4 h-4" />
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-sm text-red-600 whitespace-pre-line leading-relaxed">{error}</div>
                      {(error.includes('Invalid email or password') || error.includes('Incorrect password for demo')) && (
                        <p className="text-xs text-red-500 mt-3 pt-2 border-t border-red-200">
                          Don't have an account yet?{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('register')}
                            className="underline hover:no-underline font-medium"
                          >
                            Create one here
                          </button>
                        </p>
                      )}
                      {(error.includes('Cannot connect') || 
                        error.includes('Connection issue') ||
                        error.includes('Unable to connect') ||
                        error.includes('offline') ||
                        error.includes('Network unavailable')) && (
                        <div className="mt-3 pt-2 border-t border-red-200">
                          <p className="text-xs text-blue-600 mb-1">
                            💡 <strong>Try Demo Accounts:</strong> Click any demo account above to sign in offline
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        value={signInForm.email}
                        onChange={(e) => handleSignInInputChange('email', e.target.value)}
                        placeholder="your.email@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        value={signInForm.password}
                        onChange={(e) => handleSignInInputChange('password', e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Stay Logged In & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="stayLoggedIn"
                        checked={signInForm.stayLoggedIn}
                        onCheckedChange={(checked) => handleSignInInputChange('stayLoggedIn', checked)}
                      />
                      <Label htmlFor="stayLoggedIn" className="text-sm">
                        Stay logged in
                      </Label>
                    </div>
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-red-600 hover:text-red-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <Button 
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                    disabled={!isValidSignIn || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Secure Registration</h3>
                      <p className="text-sm text-blue-700">
                        Create your account with email verification to ensure security and choose to donate or request blood anytime.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                    
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={registerForm.fullName}
                        onChange={(e) => handleRegisterInputChange('fullName', e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="register-email">Email Address *</Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={registerForm.email}
                          onChange={(e) => handleRegisterInputChange('email', e.target.value)}
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={registerForm.phone}
                          onChange={(e) => handleRegisterInputChange('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={registerForm.dateOfBirth}
                          onChange={(e) => handleRegisterInputChange('dateOfBirth', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="bloodType">Blood Type *</Label>
                        <Select value={registerForm.bloodType} onValueChange={(value) => handleRegisterInputChange('bloodType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                          <SelectContent>
                            {bloodTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Location</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={registerForm.city}
                          onChange={(e) => handleRegisterInputChange('city', e.target.value)}
                          placeholder="Mumbai"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Select value={registerForm.state} onValueChange={(value) => handleRegisterInputChange('state', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {indianStates.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Account Security */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Security</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="register-password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showRegisterPassword ? "text" : "password"}
                            value={registerForm.password}
                            onChange={(e) => handleRegisterInputChange('password', e.target.value)}
                            placeholder="Create a strong password"
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {registerForm.password && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${getPasswordStrengthColor(registerForm.password)}`}
                                  style={{ width: registerForm.password.length >= 8 ? (validatePasswordStrength(registerForm.password) ? '100%' : '75%') : '25%' }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">{getPasswordStrengthText(registerForm.password)}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Must include: 8+ characters, uppercase, lowercase, number, and symbol
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showRegisterConfirmPassword ? "text" : "password"}
                            value={registerForm.confirmPassword}
                            onChange={(e) => handleRegisterInputChange('confirmPassword', e.target.value)}
                            placeholder="Confirm your password"
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showRegisterConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {registerForm.confirmPassword && (
                          <div className="mt-1">
                            {registerForm.password === registerForm.confirmPassword ? (
                              <p className="text-xs text-green-600">✓ Passwords match</p>
                            ) : (
                              <p className="text-xs text-red-600">✗ Passwords do not match</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Legal Agreements */}
                  <div className="space-y-3">
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="terms" 
                          checked={registerForm.agreedToTerms}
                          onCheckedChange={(checked) => handleRegisterInputChange('agreedToTerms', checked)}
                        />
                        <Label htmlFor="terms" className="text-sm leading-relaxed">
                          I agree to the <span className="text-red-600 underline cursor-pointer">Terms of Service</span> and understand that BloodConnect connects donors with recipients for life-saving blood transfusions.
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="privacy" 
                          checked={registerForm.agreedToPrivacy}
                          onCheckedChange={(checked) => handleRegisterInputChange('agreedToPrivacy', checked)}
                        />
                        <Label htmlFor="privacy" className="text-sm leading-relaxed">
                          I agree to the <span className="text-red-600 underline cursor-pointer">Privacy Policy</span> and consent to the secure storage and processing of my medical and personal information.
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Register Button */}
                  <Button 
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                    disabled={!validateRegisterForm() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}