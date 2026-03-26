"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import {
  Settings,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Wallet,
  Bell,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Mail,
} from "lucide-react";
import api from "../../../src/lib/api";

// --- Types ---
interface GeneralSettings {
  contactEmail: string;
  supportPhone: string;
  defaultTimezone: string;
  dateFormat: string;
  maintenanceMode: boolean;
}

interface PricingSettings {
  commissionRate: number;
  minHourlyRate: number;
  maxHourlyRate: number;
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
}

interface UserSettings {
  driverRequiredDocs: string[];
  hostRequiredDocs: string[];
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
}

interface ParkingSettings {
  maxSpacesPerLocation: number;
  maxLevels: number;
  requiredImagesForApproval: number;
}

interface ReservationSettings {
  minBookingDurationMinutes: number;
  maxBookingDurationHours: number;
  cancellationRefundPercent: number;
  cancellationCutoffHours: number;
  maxAdvanceBookingDays: number;
  lateCheckoutPenaltyPercent: number;
}

interface WalletSettings {
  minTopUpAmount: number;
  maxWalletBalance: number;
}

interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  smsGateway: string;
  smsApiKey: string;
  alertOnNewRegistration: boolean;
  alertOnFlaggedContent: boolean;
}

// --- Setting Field Components ---
const SettingField = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-8 py-4">
    <div className="flex-1 min-w-0">
      <Label className="text-sm font-medium text-gray-900">{label}</Label>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="sm:w-[320px] shrink-0">{children}</div>
  </div>
);

const SettingToggle = ({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-4">
    <div className="flex-1 min-w-0">
      <Label className="text-sm font-medium text-gray-900">{label}</Label>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Create admin state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");
  const [adminCreating, setAdminCreating] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState(false);
  const [adminSuccessMessage, setAdminSuccessMessage] = useState("");
  const [adminTempPassword, setAdminTempPassword] = useState<string | null>(null);

  // --- State for all settings ---
  const [general, setGeneral] = useState<GeneralSettings>({
    contactEmail: "support@parkingapp.com",
    supportPhone: "+1 (555) 123-4567",
    defaultTimezone: "Asia/Manila",
    dateFormat: "MM/DD/YYYY",
    maintenanceMode: false,
  });

  const [pricing, setPricing] = useState<PricingSettings>({
    commissionRate: 10,
    minHourlyRate: 20,
    maxHourlyRate: 500,
    currency: "PHP",
    taxRate: 12,
    taxEnabled: true,
  });

  const [userSettings, setUserSettings] = useState<UserSettings>({
    driverRequiredDocs: ["Driver's License", "Valid ID"],
    hostRequiredDocs: ["Business Permit", "Property Documents", "Valid ID"],
    maxLoginAttempts: 3,
    sessionTimeoutMinutes: 30,
  });

  const [parking, setParking] = useState<ParkingSettings>({
    maxSpacesPerLocation: 100,
    maxLevels: 10,
    requiredImagesForApproval: 3,
  });

  const [reservation, setReservation] = useState<ReservationSettings>({
    minBookingDurationMinutes: 60,
    maxBookingDurationHours: 24,
    cancellationRefundPercent: 80,
    cancellationCutoffHours: 2,
    maxAdvanceBookingDays: 30,
    lateCheckoutPenaltyPercent: 50,
  });

  const [wallet, setWallet] = useState<WalletSettings>({
    minTopUpAmount: 100,
    maxWalletBalance: 50000,
  });

  const [notification, setNotification] = useState<NotificationSettings>({
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    smsGateway: "twilio",
    smsApiKey: "",
    alertOnNewRegistration: true,
    alertOnFlaggedContent: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    // TODO: Implement actual API call to save settings
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError("Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    setPasswordSaving(true);

    try {
      await api.post("/users/change-password", {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to change password";
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCreateAdmin = async () => {
    setAdminError(null);
    setAdminSuccess(false);

    // Validation
    if (!adminEmail || !adminFirstName || !adminLastName) {
      setAdminError("Email, first name, and last name are required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      setAdminError("Please enter a valid email address");
      return;
    }

    setAdminCreating(true);

    try {
      const response = await api.post("/users/admin/create", {
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        phoneNumber: adminPhoneNumber || undefined,
      });

      setAdminSuccess(true);
      setAdminSuccessMessage(response.data.message);
      setAdminTempPassword(response.data.temporaryPassword || null);
      setAdminEmail("");
      setAdminFirstName("");
      setAdminLastName("");
      setAdminPhoneNumber("");

      // Clear success message after 10 seconds (longer if password is shown)
      setTimeout(() => {
        setAdminSuccess(false);
        setAdminTempPassword(null);
      }, response.data.temporaryPassword ? 30000 : 5000);
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to create admin account";
      setAdminError(message);
    } finally {
      setAdminCreating(false);
    }
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a202c]">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure application settings and preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        <div>
          {/* General Settings */}
          <div>
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingField
                  label="Contact Email"
                  description="Primary email for user inquiries"
                >
                  <Input
                    type="email"
                    value={general.contactEmail}
                    onChange={(e) =>
                      setGeneral({ ...general, contactEmail: e.target.value })
                    }
                    placeholder="support@example.com"
                  />
                </SettingField>

                <SettingField
                  label="Support Phone Number"
                  description="Phone number displayed to users"
                >
                  <Input
                    type="tel"
                    value={general.supportPhone}
                    onChange={(e) =>
                      setGeneral({ ...general, supportPhone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </SettingField>

                <SettingField
                  label="Default Timezone"
                  description="Used for displaying dates and times"
                >
                  <Select
                    value={general.defaultTimezone}
                    onValueChange={(value) =>
                      setGeneral({ ...general, defaultTimezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Manila">Asia/Manila (GMT+8)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingField>

                <SettingField
                  label="Date Format"
                  description="How dates are displayed throughout the app"
                >
                  <Select
                    value={general.dateFormat}
                    onValueChange={(value) =>
                      setGeneral({ ...general, dateFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingField>

                <SettingToggle
                  label="Maintenance Mode"
                  description="When enabled, users will see a maintenance page"
                  checked={general.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setGeneral({ ...general, maintenanceMode: checked })
                  }
                />
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="shadow-sm border-gray-100 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-600" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    Password changed successfully
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={passwordSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Create Admin Card */}
            <Card className="shadow-sm border-gray-100 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-gray-600" />
                  Create Admin Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Create a new admin account. Login credentials will be automatically generated and sent to the provided email address.
                </p>

                {adminError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {adminError}
                  </div>
                )}

                {adminSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      {adminSuccessMessage}
                    </div>
                    {adminTempPassword && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                        <p className="font-medium">Temporary Password (share this manually):</p>
                        <code className="block mt-1 p-2 bg-white rounded border font-mono text-sm select-all">
                          {adminTempPassword}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">First Name *</Label>
                    <Input
                      id="adminFirstName"
                      value={adminFirstName}
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Last Name *</Label>
                    <Input
                      id="adminLastName"
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email Address *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                  <p className="text-xs text-gray-500">
                    Login credentials will be sent to this email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPhoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="adminPhoneNumber"
                    type="tel"
                    value={adminPhoneNumber}
                    onChange={(e) => setAdminPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleCreateAdmin}
                    disabled={adminCreating}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {adminCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Admin...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Create & Send Credentials
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Future settings tabs are preserved below and temporarily disabled */}
          {false && (
            <>

          {/* Pricing & Commission Settings */}
          <TabsContent value="pricing" className="mt-0">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  Pricing & Commission
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingField
                  label="Platform Commission Rate"
                  description="Percentage taken from each booking"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pricing.commissionRate}
                      onChange={(e) =>
                        setPricing({ ...pricing, commissionRate: Number(e.target.value) })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Minimum Hourly Rate"
                  description="Lowest rate hosts can set per hour"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={pricing.minHourlyRate}
                      onChange={(e) =>
                        setPricing({ ...pricing, minHourlyRate: Number(e.target.value) })
                      }
                      className="pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{pricing.currency}</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Maximum Hourly Rate"
                  description="Highest rate hosts can set per hour"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={pricing.maxHourlyRate}
                      onChange={(e) =>
                        setPricing({ ...pricing, maxHourlyRate: Number(e.target.value) })
                      }
                      className="pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{pricing.currency}</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Currency"
                  description="Default currency for all transactions"
                >
                  <Select
                    value={pricing.currency}
                    onValueChange={(value) =>
                      setPricing({ ...pricing, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingField>

                <SettingToggle
                  label="Enable Tax/VAT"
                  description="Apply tax to all transactions"
                  checked={pricing.taxEnabled}
                  onCheckedChange={(checked) =>
                    setPricing({ ...pricing, taxEnabled: checked })
                  }
                />

                {pricing.taxEnabled && (
                  <SettingField label="Tax Rate" description="VAT/Tax percentage">
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pricing.taxRate}
                        onChange={(e) =>
                          setPricing({ ...pricing, taxRate: Number(e.target.value) })
                        }
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </SettingField>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User & Verification Settings */}
          <TabsContent value="user" className="mt-0">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  User & Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingField
                  label="Required Documents for Drivers"
                  description="Comma-separated list of required documents"
                >
                  <Textarea
                    value={userSettings.driverRequiredDocs.join(", ")}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        driverRequiredDocs: e.target.value.split(",").map((s) => s.trim()),
                      })
                    }
                    placeholder="Driver's License, Valid ID"
                    rows={2}
                  />
                </SettingField>

                <SettingField
                  label="Required Documents for Hosts"
                  description="Comma-separated list of required documents"
                >
                  <Textarea
                    value={userSettings.hostRequiredDocs.join(", ")}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        hostRequiredDocs: e.target.value.split(",").map((s) => s.trim()),
                      })
                    }
                    placeholder="Business Permit, Property Documents"
                    rows={2}
                  />
                </SettingField>

                <SettingField
                  label="Maximum Login Attempts"
                  description="Number of failed attempts before account lockout"
                >
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={userSettings.maxLoginAttempts}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        maxLoginAttempts: Number(e.target.value),
                      })
                    }
                  />
                </SettingField>

                <SettingField
                  label="Session Timeout"
                  description="Minutes of inactivity before automatic logout"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={5}
                      value={userSettings.sessionTimeoutMinutes}
                      onChange={(e) =>
                        setUserSettings({
                          ...userSettings,
                          sessionTimeoutMinutes: Number(e.target.value),
                        })
                      }
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">minutes</span>
                  </div>
                </SettingField>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Parking Location Settings */}
          <TabsContent value="parking" className="mt-0">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  Parking Location
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingField
                  label="Maximum Spaces per Location"
                  description="Maximum parking spaces a host can add per location"
                >
                  <Input
                    type="number"
                    min={1}
                    value={parking.maxSpacesPerLocation}
                    onChange={(e) =>
                      setParking({
                        ...parking,
                        maxSpacesPerLocation: Number(e.target.value),
                      })
                    }
                  />
                </SettingField>

                <SettingField
                  label="Maximum Parking Levels"
                  description="Default maximum levels for multi-level parking"
                >
                  <Input
                    type="number"
                    min={1}
                    value={parking.maxLevels}
                    onChange={(e) =>
                      setParking({
                        ...parking,
                        maxLevels: Number(e.target.value),
                      })
                    }
                  />
                </SettingField>

                <SettingField
                  label="Required Images for Approval"
                  description="Minimum number of images hosts must upload"
                >
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={parking.requiredImagesForApproval}
                    onChange={(e) =>
                      setParking({
                        ...parking,
                        requiredImagesForApproval: Number(e.target.value),
                      })
                    }
                  />
                </SettingField>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservation Settings */}
          <TabsContent value="reservation" className="mt-0">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  Reservation
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingField
                  label="Minimum Booking Duration"
                  description="Shortest allowed booking time"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={15}
                      value={reservation.minBookingDurationMinutes}
                      onChange={(e) =>
                        setReservation({
                          ...reservation,
                          minBookingDurationMinutes: Number(e.target.value),
                        })
                      }
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">minutes</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Maximum Booking Duration"
                  description="Longest allowed booking time"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={reservation.maxBookingDurationHours}
                      onChange={(e) =>
                        setReservation({
                          ...reservation,
                          maxBookingDurationHours: Number(e.target.value),
                        })
                      }
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">hours</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Cancellation Refund Percentage"
                  description="Amount refunded when users cancel"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={reservation.cancellationRefundPercent}
                      onChange={(e) =>
                        setReservation({
                          ...reservation,
                          cancellationRefundPercent: Number(e.target.value),
                        })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Cancellation Cutoff Time"
                  description="Hours before reservation when cancellation is no longer allowed"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={reservation.cancellationCutoffHours}
                      onChange={(e) =>
                        setReservation({
                          ...reservation,
                          cancellationCutoffHours: Number(e.target.value),
                        })
                      }
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">hours</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Advance Booking Limit"
                  description="How far ahead users can make reservations"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={reservation.maxAdvanceBookingDays}
                      onChange={(e) =>
                        setReservation({
                          ...reservation,
                          maxAdvanceBookingDays: Number(e.target.value),
                        })
                      }
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">days</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Late Checkout Penalty"
                  description="Additional charge for overstaying"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      value={reservation.lateCheckoutPenaltyPercent}
                      onChange={(e) =>
                        setReservation({
                          ...reservation,
                          lateCheckoutPenaltyPercent: Number(e.target.value),
                        })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </SettingField>
              </CardContent>
            </Card>
          </TabsContent>

          {/* E-Wallet & Payment Settings */}
          <TabsContent value="wallet" className="mt-0">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-gray-600" />
                  E-Wallet & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingField
                  label="Minimum Top-up Amount"
                  description="Smallest amount users can add to wallet"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={wallet.minTopUpAmount}
                      onChange={(e) =>
                        setWallet({
                          ...wallet,
                          minTopUpAmount: Number(e.target.value),
                        })
                      }
                      className="pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{pricing.currency}</span>
                  </div>
                </SettingField>

                <SettingField
                  label="Maximum Wallet Balance"
                  description="Maximum amount users can hold in wallet"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={100}
                      value={wallet.maxWalletBalance}
                      onChange={(e) =>
                        setWallet({
                          ...wallet,
                          maxWalletBalance: Number(e.target.value),
                        })
                      }
                      className="pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{pricing.currency}</span>
                  </div>
                </SettingField>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notification" className="mt-0">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-600" />
                  Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                <SettingToggle
                  label="Email Notifications"
                  description="Send email notifications to users"
                  checked={notification.emailNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    setNotification({
                      ...notification,
                      emailNotificationsEnabled: checked,
                    })
                  }
                />

                <SettingToggle
                  label="Push Notifications"
                  description="Send push notifications to mobile app users"
                  checked={notification.pushNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    setNotification({
                      ...notification,
                      pushNotificationsEnabled: checked,
                    })
                  }
                />

                <Separator className="my-2" />

                <SettingField
                  label="SMS Gateway"
                  description="Service provider for SMS notifications"
                >
                  <Select
                    value={notification.smsGateway}
                    onValueChange={(value) =>
                      setNotification({ ...notification, smsGateway: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="nexmo">Nexmo (Vonage)</SelectItem>
                      <SelectItem value="semaphore">Semaphore</SelectItem>
                      <SelectItem value="plivo">Plivo</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingField>

                <SettingField
                  label="SMS API Key"
                  description="API key for the selected SMS gateway"
                >
                  <Input
                    type="password"
                    value={notification.smsApiKey}
                    onChange={(e) =>
                      setNotification({
                        ...notification,
                        smsApiKey: e.target.value,
                      })
                    }
                    placeholder="Enter API key"
                  />
                </SettingField>

                <Separator className="my-2" />

                <div className="pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Admin Alert Preferences</h4>
                </div>

                <SettingToggle
                  label="New Registration Alerts"
                  description="Receive alerts when new users register"
                  checked={notification.alertOnNewRegistration}
                  onCheckedChange={(checked) =>
                    setNotification({
                      ...notification,
                      alertOnNewRegistration: checked,
                    })
                  }
                />

                <SettingToggle
                  label="Flagged Content Alerts"
                  description="Receive alerts for reported or flagged content"
                  checked={notification.alertOnFlaggedContent}
                  onCheckedChange={(checked) =>
                    setNotification({
                      ...notification,
                      alertOnFlaggedContent: checked,
                    })
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
