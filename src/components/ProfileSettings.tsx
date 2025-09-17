import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { 
  User, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Edit3, 
  Save, 
  AlertTriangle,
  Calendar,
  Shield,
  Settings,
  X
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { profile } from "../utils/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'donor' | 'patient' | 'clinic';
  bloodType?: string;
  location: string;
  phoneNumber: string;
  createdAt: string;
  isAvailable?: boolean;
  organizationType?: string;
  organizationName?: string;
}

interface ProfileSettingsProps {
  userProfile: UserProfile;
  onProfileUpdate: () => void;
}

export function ProfileSettings({ userProfile, onProfileUpdate }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: userProfile.fullName,
    phoneNumber: userProfile.phoneNumber,
    location: userProfile.location,
    bloodType: userProfile.bloodType || '',
    isAvailable: userProfile.isAvailable || false,
    organizationName: userProfile.organizationName || '',
    organizationType: userProfile.organizationType || ''
  });

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const organizationTypes = ['Hospital', 'Blood Bank', 'Clinic', 'Medical Center', 'Non-profit', 'Other'];

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const updateData = {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        location: formData.location.trim(),
        ...(userProfile.role === 'donor' && {
          bloodType: formData.bloodType,
          isAvailable: formData.isAvailable
        }),
        ...(userProfile.role === 'clinic' && {
          organizationName: formData.organizationName.trim(),
          organizationType: formData.organizationType
        })
      };

      const result = await profile.update(updateData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setIsEditing(false);
      toast.success('Profile updated successfully!');
      onProfileUpdate();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: userProfile.fullName,
      phoneNumber: userProfile.phoneNumber,
      location: userProfile.location,
      bloodType: userProfile.bloodType || '',
      isAvailable: userProfile.isAvailable || false,
      organizationName: userProfile.organizationName || '',
      organizationType: userProfile.organizationType || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm" disabled={isLoading}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <CardDescription>
            Manage your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg">
                {userProfile.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold">{userProfile.fullName}</h3>
                <Badge variant={userProfile.role === 'donor' ? 'default' : 'secondary'} className="capitalize">
                  {userProfile.role}
                </Badge>
              </div>
              <p className="text-gray-600 mb-1">{userProfile.email}</p>
              <p className="text-sm text-gray-500">
                Member since {new Date(userProfile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              {isEditing ? (
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="py-2 px-3 bg-gray-50 rounded-md">{userProfile.fullName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-600">{userProfile.email}</p>
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              {isEditing ? (
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="py-2 px-3 bg-gray-50 rounded-md">{userProfile.phoneNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              {isEditing ? (
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Enter your location"
                />
              ) : (
                <p className="py-2 px-3 bg-gray-50 rounded-md">{userProfile.location}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific Information */}
      {userProfile.role === 'donor' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Donor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Blood Type</label>
                {isEditing ? (
                  <Select value={formData.bloodType} onValueChange={(value) => setFormData({...formData, bloodType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      {bloodTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="py-2 px-3 bg-red-50 rounded-md">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {userProfile.bloodType}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Availability Status</label>
                {isEditing ? (
                  <div className="flex items-center space-x-2 py-2">
                    <Switch
                      checked={formData.isAvailable}
                      onCheckedChange={(checked) => setFormData({...formData, isAvailable: checked})}
                    />
                    <span className="text-sm">
                      {formData.isAvailable ? 'Available to donate' : 'Not available'}
                    </span>
                  </div>
                ) : (
                  <div className="py-2 px-3 bg-gray-50 rounded-md">
                    <Badge variant={userProfile.isAvailable ? "default" : "secondary"}>
                      {userProfile.isAvailable ? "Available to Donate" : "Not Available"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {userProfile.role === 'clinic' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Name</label>
                {isEditing ? (
                  <Input
                    value={formData.organizationName}
                    onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                    placeholder="Enter organization name"
                  />
                ) : (
                  <p className="py-2 px-3 bg-gray-50 rounded-md">
                    {userProfile.organizationName || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Type</label>
                {isEditing ? (
                  <Select value={formData.organizationType} onValueChange={(value) => setFormData({...formData, organizationType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="py-2 px-3 bg-gray-50 rounded-md">
                    {userProfile.organizationType || 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your account security and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-gray-600">Last updated: Not available</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Manage how your data is used and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Download Your Data</h4>
              <p className="text-sm text-gray-600">Get a copy of your data</p>
            </div>
            <Button variant="outline" size="sm">
              Download Data
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
            <div>
              <h4 className="font-medium text-red-600">Delete Account</h4>
              <p className="text-sm text-gray-600">Permanently delete your account and data</p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}