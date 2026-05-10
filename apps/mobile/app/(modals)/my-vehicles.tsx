import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { driversService } from "../../src/services/drivers";
import { userService } from "../../src/services/user";

type Vehicle = {
  id: string;
  plateNumber: string;
  vehicleType: string;
  brand: string;
  model: string;
  color: string;
  isActive: boolean;
  registrationImageUrl: string | null;
  orImageUrl: string | null;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
};

const VEHICLE_TYPES = ["CAR", "MOTORCYCLE"] as const;

const TYPE_IMAGES: Record<string, any> = {
  CAR: require("../../assets/images/ParkUp UI/sedan_14703757.png"),
  MOTORCYCLE: require("../../assets/images/ParkUp UI/scooter_16804043.png"),
};

const STATUS_CONFIG = {
  APPROVED: { label: "Verified", bg: "#E8F5E9", border: "#A5D6A7", text: "#2E7D32", icon: "verified" as const },
  PENDING:  { label: "Pending Verification", bg: "#FFF8E1", border: "#FFE0B2", text: "#F57C00", icon: "schedule" as const },
  REJECTED: { label: "Rejected", bg: "#FFEBEE", border: "#EF9A9A", text: "#C62828", icon: "cancel" as const },
};

export default function MyVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCRId, setUploadingCRId] = useState<string | null>(null);
  const [uploadingORId, setUploadingORId] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [proofImageLabel, setProofImageLabel] = useState<string>("Document");
  // "list" | "add-details" | "add-registration" | "edit"
  const [view, setView] = useState<"list" | "add-details" | "add-registration" | "edit">("list");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [newlyAddedVehicle, setNewlyAddedVehicle] = useState<Vehicle | null>(null);
  const [isDriverVerified, setIsDriverVerified] = useState(true);

  // Form state
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("CAR");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profile] = await Promise.all([
        driversService.getVehicles(),
        userService.getProfile(),
      ]);
      setVehicles(data);
      const verified =
        profile.roleStatuses?.some(
          (rs: { role: string; status: string }) =>
            rs.role === "DRIVER" && rs.status === "VERIFIED",
        ) ?? false;
      setIsDriverVerified(verified);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [fetchVehicles]),
  );

  const resetForm = () => {
    setPlateNumber("");
    setVehicleType("CAR");
    setBrand("");
    setModel("");
    setColor("");
    setEditingVehicle(null);
    setNewlyAddedVehicle(null);
  };

  const handleBack = () => {
    resetForm();
    setView("list");
  };

  const handleAdd = async () => {
    if (!plateNumber.trim()) {
      Alert.alert("Error", "Plate number is required.");
      return;
    }
    setSaving(true);
    try {
      const created = await driversService.addVehicle({
        plateNumber: plateNumber.trim(),
        vehicleType,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
      });
      await fetchVehicles();
      // Move to registration upload step
      setNewlyAddedVehicle(created);
      setView("add-registration");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to add vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingVehicle) return;
    if (!plateNumber.trim()) {
      Alert.alert("Error", "Plate number is required.");
      return;
    }

    const doUpdate = async () => {
      setSaving(true);
      try {
        await driversService.updateVehicle(editingVehicle.id, {
          plateNumber: plateNumber.trim(),
          vehicleType,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          color: color.trim() || undefined,
        });
        Alert.alert("Success", "Vehicle updated!");
        resetForm();
        setView("list");
        fetchVehicles();
      } catch (err: any) {
        Alert.alert("Error", err?.response?.data?.message || "Failed to update vehicle.");
      } finally {
        setSaving(false);
      }
    };

    if (editingVehicle.verificationStatus === "APPROVED") {
      Alert.alert(
        "Re-approval Required",
        "Editing this vehicle will reset its verification status. It won't be usable for booking until an admin re-approves it. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", style: "destructive", onPress: doUpdate },
        ],
      );
    } else {
      doUpdate();
    }
  };

  const handleDelete = (vehicleId: string, plate: string) => {
    Alert.alert("Delete Vehicle", `Remove ${plate}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await driversService.deleteVehicle(vehicleId);
            setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
          } catch {
            Alert.alert("Error", "Failed to delete vehicle.");
          }
        },
      },
    ]);
  };

  const handleUploadRegistration = async (vehicle: Vehicle, type: "CR" | "OR") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const setUploading = type === "OR" ? setUploadingORId : setUploadingCRId;
    setUploading(vehicle.id);
    try {
      const formData = new FormData();
      formData.append("file", { uri, name: "registration.jpg", type: "image/jpeg" } as any);
      await driversService.uploadVehicleRegistration(vehicle.id, formData, type);
      Alert.alert("Submitted", `${type === "OR" ? "Official Receipt" : "Certificate of Registration"} uploaded successfully.`);
      await fetchVehicles();
    } catch {
      Alert.alert("Error", `Failed to upload ${type === "OR" ? "OR" : "CR"} image.`);
    } finally {
      setUploading(null);
    }
  };

  const openEditForm = (vehicle: Vehicle) => {
    setPlateNumber(vehicle.plateNumber || "");
    setVehicleType(vehicle.vehicleType || "CAR");
    setBrand(vehicle.brand || "");
    setModel(vehicle.model || "");
    setColor(vehicle.color || "");
    setEditingVehicle(vehicle);
    setView("edit");
  };

  // ─── Vehicle Card ─────────────────────────────────────────────
  const renderVehicleCard = ({ item }: { item: Vehicle }) => {
    const details = [item.brand, item.model].filter(Boolean).join(" ");
    const statusCfg = STATUS_CONFIG[item.verificationStatus] ?? STATUS_CONFIG.PENDING;
    const isUploadingCR = uploadingCRId === item.id;
    const isUploadingOR = uploadingORId === item.id;

    return (
      <View style={styles.card}>
        {/* Top section */}
        <View style={styles.cardTop}>
          <View style={styles.cardImageBg}>
            <Image
              source={TYPE_IMAGES[item.vehicleType] || TYPE_IMAGES.CAR}
              style={styles.vehicleImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {details || "Vehicle"}
            </Text>

            <View style={styles.tagRow}>
              {item.color ? (
                <View style={styles.colorTag}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.tagText}>{item.color}</Text>
                </View>
              ) : null}
              <View style={styles.typeTag}>
                <Image
                  source={TYPE_IMAGES[item.vehicleType] || TYPE_IMAGES.CAR}
                  style={{ width: 12, height: 12, tintColor: "#D4501E" }}
                  resizeMode="contain"
                />
                <Text style={[styles.tagText, { color: "#D4501E" }]}>{item.vehicleType}</Text>
              </View>
            </View>

            <View style={styles.plateBadge}>
              <MaterialIcons name="confirmation-number" size={13} color="#D4501E" />
              <Text style={styles.plateText}>{item.plateNumber}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="edit" size={17} color="#D4501E" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGray]} onPress={() => handleDelete(item.id, item.plateNumber)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="delete-outline" size={17} color="#6C6C70" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Registration section */}
        <View style={[styles.regSection, { borderTopColor: statusCfg.border }]}>
          {/* Status pill */}
          <View style={styles.regTopRow}>
            <View style={[styles.statusPill, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
              <MaterialIcons name={statusCfg.icon} size={13} color={statusCfg.text} />
              <Text style={[styles.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {/* Rejection reason */}
          {item.verificationStatus === "REJECTED" && item.rejectionReason ? (
            <View style={styles.rejectionNote}>
              <MaterialIcons name="error-outline" size={13} color="#C62828" />
              <Text style={styles.rejectionNoteText}>{item.rejectionReason}</Text>
            </View>
          ) : null}

          {/* OR row */}
          <View style={styles.docRow}>
            <Text style={styles.docLabel}>Official Receipt (OR)</Text>
            <View style={styles.docActions}>
              {item.orImageUrl && (
                <TouchableOpacity
                  style={styles.viewProofBtn}
                  onPress={() => { setProofImageLabel("Official Receipt (OR)"); setProofImageUrl(item.orImageUrl); }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="image-search" size={14} color="#1976D2" />
                  <Text style={styles.viewProofText}>View</Text>
                </TouchableOpacity>
              )}
              {item.verificationStatus !== "APPROVED" && (
                <TouchableOpacity
                  style={[styles.uploadRowBtn, isUploadingOR && styles.uploadBlockDisabled]}
                  onPress={() => handleUploadRegistration(item, "OR")}
                  disabled={isUploadingOR}
                  activeOpacity={0.8}
                >
                  {isUploadingOR ? (
                    <ActivityIndicator size="small" color="#D4501E" />
                  ) : (
                    <>
                      <MaterialIcons name="upload-file" size={14} color="#D4501E" />
                      <Text style={styles.uploadRowBtnText}>{item.orImageUrl ? "Re-upload" : "Upload"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* CR row */}
          <View style={styles.docRow}>
            <Text style={styles.docLabel}>Certificate of Reg. (CR)</Text>
            <View style={styles.docActions}>
              {item.registrationImageUrl && (
                <TouchableOpacity
                  style={styles.viewProofBtn}
                  onPress={() => { setProofImageLabel("Certificate of Registration (CR)"); setProofImageUrl(item.registrationImageUrl); }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="image-search" size={14} color="#1976D2" />
                  <Text style={styles.viewProofText}>View</Text>
                </TouchableOpacity>
              )}
              {item.verificationStatus !== "APPROVED" && (
                <TouchableOpacity
                  style={[styles.uploadRowBtn, isUploadingCR && styles.uploadBlockDisabled]}
                  onPress={() => handleUploadRegistration(item, "CR")}
                  disabled={isUploadingCR}
                  activeOpacity={0.8}
                >
                  {isUploadingCR ? (
                    <ActivityIndicator size="small" color="#D4501E" />
                  ) : (
                    <>
                      <MaterialIcons name="upload-file" size={14} color="#D4501E" />
                      <Text style={styles.uploadRowBtnText}>{item.registrationImageUrl ? "Re-upload" : "Upload"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── Add Details Form ─────────────────────────────────────────
  const renderAddForm = () => (
    <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 1 of 2</Text></View>
        <Text style={styles.formTitle}>Vehicle Details</Text>
        <Text style={styles.formSubtitle}>Enter your vehicle information</Text>
      </View>

      <Text style={styles.fieldLabel}>Vehicle Type</Text>
      <View style={styles.typeRow}>
        {VEHICLE_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, vehicleType === t && styles.typeChipActive]}
            onPress={() => setVehicleType(t)}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Image
              source={TYPE_IMAGES[t]}
              style={{ width: 28, height: 28, tintColor: vehicleType === t ? "#fff" : "#A09A94", marginBottom: 4 }}
              resizeMode="contain"
            />
            <Text style={[styles.typeChipText, vehicleType === t && styles.typeChipTextActive]}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Plate Number <Text style={{ color: "#D4501E" }}>*</Text></Text>
      <TextInput style={styles.input} placeholder="e.g. ABC 1234" placeholderTextColor="#aaa" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" editable={!saving} />

      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Brand</Text>
          <TextInput style={styles.input} placeholder="e.g. Honda" placeholderTextColor="#aaa" value={brand} onChangeText={setBrand} editable={!saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Model</Text>
          <TextInput style={styles.input} placeholder="e.g. Civic" placeholderTextColor="#aaa" value={model} onChangeText={setModel} editable={!saving} />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Color</Text>
      <TextInput style={styles.input} placeholder="e.g. White, Black" placeholderTextColor="#aaa" value={color} onChangeText={setColor} editable={!saving} />

      <TouchableOpacity
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
        onPress={handleAdd}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator color="#fff" /> : (
          <View style={styles.submitInner}>
            <Text style={styles.submitBtnText}>Next: Upload Registration</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // ─── Add Registration Step ────────────────────────────────────
  const renderAddRegistration = () => {
    const target = newlyAddedVehicle ?? vehicles[vehicles.length - 1];
    if (!target) return null;
    const isUploadingCRNow = uploadingCRId === target.id;
    const isUploadingORNow = uploadingORId === target.id;

    const orDone = !!target.orImageUrl;
    const crDone = !!target.registrationImageUrl;
    const anyUploaded = orDone || crDone;

    const renderUploadBlock = (type: "OR" | "CR", isUploading: boolean, uploaded: boolean) => (
      <TouchableOpacity
        style={[styles.uploadBlockLarge, isUploading && styles.uploadBlockDisabled, uploaded && styles.uploadBlockDone]}
        onPress={() => handleUploadRegistration(target, type)}
        disabled={isUploading}
        activeOpacity={0.8}
      >
        {isUploading ? (
          <View style={styles.uploadingState}>
            <ActivityIndicator size="large" color="#D4501E" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : (
          <View style={styles.uploadPlaceholderLarge}>
            <View style={[styles.uploadIconCircle, uploaded && { backgroundColor: "#E8F5E9" }]}>
              <MaterialIcons name={uploaded ? "check-circle" : "upload-file"} size={32} color={uploaded ? "#4CAF50" : "#D4501E"} />
            </View>
            <Text style={[styles.uploadLargeTitle, uploaded && { color: "#4CAF50" }]}>
              {type === "OR" ? "Official Receipt (OR)" : "Certificate of Reg. (CR)"}
            </Text>
            <Text style={styles.uploadLargeSub}>{uploaded ? "Uploaded — tap to replace" : "Tap to select image"}</Text>
          </View>
        )}
      </TouchableOpacity>
    );

    return (
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" }]}>
            <Text style={[styles.stepBadgeText, { color: "#2E7D32" }]}>Step 2 of 2</Text>
          </View>
          <Text style={styles.formTitle}>Vehicle Documents</Text>
          <Text style={styles.formSubtitle}>Upload your OR and CR for admin verification</Text>
        </View>

        <View style={styles.vehicleSummaryChip}>
          <Image source={TYPE_IMAGES[target.vehicleType] || TYPE_IMAGES.CAR} style={{ width: 32, height: 32, tintColor: "#D4501E" }} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleSummaryName}>{[target.brand, target.model].filter(Boolean).join(" ") || "Vehicle"}</Text>
            <Text style={styles.vehicleSummaryPlate}>{target.plateNumber}</Text>
          </View>
        </View>

        {renderUploadBlock("OR", isUploadingORNow, orDone)}
        {renderUploadBlock("CR", isUploadingCRNow, crDone)}

        <View style={styles.uploadTips}>
          <Text style={styles.uploadTipsTitle}>Tips for a clear photo:</Text>
          {["Lay the document flat on a surface", "Ensure all text is readable", "Avoid glare and shadows", "All four corners should be visible"].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <MaterialIcons name="check-circle-outline" size={14} color="#2E7D32" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {anyUploaded ? (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => { setView("list"); resetForm(); }}
            activeOpacity={0.8}
          >
            <View style={styles.submitInner}>
              <MaterialIcons name="check-circle-outline" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Done — Submit for Review</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.skipBtn} onPress={() => { setView("list"); resetForm(); }}>
          <Text style={styles.skipBtnText}>{anyUploaded ? "Go back to vehicles" : "Skip for now — upload later from My Vehicles"}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ─── Edit Form ────────────────────────────────────────────────
  const renderEditForm = () => (
    <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {editingVehicle && renderVehicleCard({ item: editingVehicle })}

      <View style={[styles.stepHeader, { marginTop: 16 }]}>
        <Text style={styles.formTitle}>Edit Vehicle</Text>
      </View>

      <Text style={styles.fieldLabel}>Vehicle Type</Text>
      <View style={styles.typeRow}>
        {VEHICLE_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, vehicleType === t && styles.typeChipActive]}
            onPress={() => setVehicleType(t)}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Image
              source={TYPE_IMAGES[t]}
              style={{ width: 28, height: 28, tintColor: vehicleType === t ? "#fff" : "#A09A94", marginBottom: 4 }}
              resizeMode="contain"
            />
            <Text style={[styles.typeChipText, vehicleType === t && styles.typeChipTextActive]}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Plate Number <Text style={{ color: "#D4501E" }}>*</Text></Text>
      <TextInput style={styles.input} placeholder="e.g. ABC 1234" placeholderTextColor="#aaa" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" editable={!saving} />

      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Brand</Text>
          <TextInput style={styles.input} placeholder="e.g. Honda" placeholderTextColor="#aaa" value={brand} onChangeText={setBrand} editable={!saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Model</Text>
          <TextInput style={styles.input} placeholder="e.g. Civic" placeholderTextColor="#aaa" value={model} onChangeText={setModel} editable={!saving} />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Color</Text>
      <TextInput style={styles.input} placeholder="e.g. White, Black" placeholderTextColor="#aaa" value={color} onChangeText={setColor} editable={!saving} />

      <TouchableOpacity
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
        onPress={handleUpdate}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator color="#fff" /> : (
          <View style={styles.submitInner}>
            <MaterialIcons name="check-circle-outline" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Save Changes</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={handleBack}>
        <Text style={styles.skipBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const isInSubView = view !== "list";

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={isInSubView ? handleBack : () => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="chevron-left" size={28} color="#D4501E" />
            </TouchableOpacity>
          ),
          title: view === "add-details" ? "Add Vehicle" : view === "add-registration" ? "Upload Registration" : view === "edit" ? "Edit Vehicle" : "My Vehicles",
        }}
      />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* ── List view ── */}
        {view === "list" && (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>My Vehicles</Text>
                <Text style={styles.subtitle}>{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} registered</Text>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, !isDriverVerified && styles.addBtnDisabled]}
                onPress={() => !isDriverVerified ? router.push("/(modals)/driver-verification") : setView("add-details")}
                activeOpacity={0.8}
              >
                <MaterialIcons name={!isDriverVerified ? "lock" : "add"} size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {!isDriverVerified && (
              <TouchableOpacity style={styles.verifyBanner} onPress={() => router.push("/(modals)/driver-verification")} activeOpacity={0.8}>
                <MaterialIcons name="verified-user" size={20} color="#D4501E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifyBannerTitle}>Verification required</Text>
                  <Text style={styles.verifyBannerText}>Verify your driver account to add and manage vehicles.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#D4501E" />
              </TouchableOpacity>
            )}

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#D4501E" />
              </View>
            ) : vehicles.length === 0 ? (
              <View style={styles.centered}>
                <View style={styles.emptyIcon}>
                  <MaterialIcons name="directions-car" size={48} color="#D4501E" />
                </View>
                <Text style={styles.emptyTitle}>No vehicles yet</Text>
                <Text style={styles.emptySubtitle}>Tap + to add your first vehicle</Text>
              </View>
            ) : (
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id}
                renderItem={renderVehicleCard}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}

        {/* ── Add details ── */}
        {view === "add-details" && renderAddForm()}

        {/* ── Add registration ── */}
        {view === "add-registration" && renderAddRegistration()}

        {/* ── Edit ── */}
        {view === "edit" && renderEditForm()}

      </KeyboardAvoidingView>

      {/* Full-screen image viewer */}
      <Modal visible={!!proofImageUrl} transparent animationType="fade" onRequestClose={() => setProofImageUrl(null)}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <View style={styles.imageModal}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setProofImageUrl(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.imageModalTitle}>{proofImageLabel}</Text>
          {proofImageUrl && (
            <Image
              source={{ uri: proofImageUrl }}
              style={styles.imageModalImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#232230", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#A09A94", marginTop: 2 },
  addBtn: { backgroundColor: "#D4501E", width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", shadowColor: "#D4501E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  addBtnDisabled: { backgroundColor: "#B0BEC5", shadowOpacity: 0, elevation: 0 },

  // Verify banner
  verifyBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF8E1", borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 12, borderWidth: 1.5, borderColor: "#D4501E" },
  verifyBannerTitle: { fontSize: 14, fontWeight: "700", color: "#D4501E" },
  verifyBannerText: { fontSize: 12, color: "#A09A94", marginTop: 2 },

  // Empty
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingBottom: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#FFF0EC", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#232230" },
  emptySubtitle: { fontSize: 14, color: "#A09A94" },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },

  // ── Vehicle Card ──────────────────────────────────────────────
  card: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },

  cardTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  cardImageBg: { width: 72, height: 72, borderRadius: 16, backgroundColor: "#FFF0EC", justifyContent: "center", alignItems: "center" },
  vehicleImage: { width: 48, height: 48 },

  cardInfo: { flex: 1, gap: 6 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#232230" },

  tagRow: { flexDirection: "row", gap: 6 },
  colorTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F2F2F7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  typeTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF0EC", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  colorDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  tagText: { fontSize: 11, fontWeight: "600", color: "#555", textTransform: "capitalize" },

  plateBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", borderWidth: 1.5, borderColor: "#D4501E", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  plateText: { fontSize: 13, fontWeight: "800", color: "#D4501E", letterSpacing: 1 },

  cardActions: { flexDirection: "column", gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFF0EC", justifyContent: "center", alignItems: "center" },
  actionBtnGray: { backgroundColor: "#F2F2F7" },

  // Registration section
  regSection: { borderTopWidth: 1, borderTopColor: "#F0F0F0", padding: 14, gap: 10, paddingBottom: 5 },

  regTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },

  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusPillText: { fontSize: 12, fontWeight: "700" },

  rejectionNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#FFEBEE", borderRadius: 8, padding: 8 },
  rejectionNoteText: { flex: 1, fontSize: 12, color: "#C62828", lineHeight: 17 },

  uploadBlockDisabled: { opacity: 0.6 },
  uploadPlaceholder: { padding: 20, alignItems: "center", gap: 6 },
  uploadPlaceholderTitle: { fontSize: 13, fontWeight: "700", color: "#D4501E", textAlign: "center" },
  uploadPlaceholderSub: { fontSize: 11, color: "#A09A94", textAlign: "center" },

  imageModal: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  imageModalClose: { position: "absolute", top: 52, right: 20, zIndex: 10, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 8 },
  imageModalTitle: { position: "absolute", top: 56, left: 20, right: 60, color: "#fff", fontSize: 15, fontWeight: "700" },
  imageModalImg: { width: "100%", height: "80%" },

  regActionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  docRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 4 },
  docLabel: { fontSize: 12, fontWeight: "600", color: "#6C6C70", flex: 1 },
  docActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewProofBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  viewProofText: { fontSize: 12, fontWeight: "700", color: "#1976D2" },
  uploadRowBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FFF0EC", borderWidth: 1, borderColor: "#D4501E" },
  uploadRowBtnText: { fontSize: 12, fontWeight: "700", color: "#D4501E" },

  // ── Forms ─────────────────────────────────────────────────────
  formScroll: { padding: 20, paddingBottom: 40 },

  stepHeader: { marginBottom: 24 },
  stepBadge: { alignSelf: "flex-start", backgroundColor: "#FFF0EC", borderWidth: 1, borderColor: "#D4501E", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  stepBadgeText: { fontSize: 11, fontWeight: "700", color: "#D4501E" },
  formTitle: { fontSize: 22, fontWeight: "800", color: "#232230", letterSpacing: -0.4 },
  formSubtitle: { fontSize: 13, color: "#A09A94", marginTop: 4 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#A09A94", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: "#E8ECF0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, backgroundColor: "#FFFFFF", color: "#232230", marginBottom: 4 },
  inputRow: { flexDirection: "row", gap: 10 },

  typeRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  typeChip: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#E8ECF0", alignItems: "center", backgroundColor: "#FFFFFF" },
  typeChipActive: { backgroundColor: "#D4501E", borderColor: "#D4501E" },
  typeChipText: { fontSize: 12, fontWeight: "700", color: "#A09A94" },
  typeChipTextActive: { color: "#fff" },

  submitBtn: { backgroundColor: "#D4501E", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 16, shadowColor: "#D4501E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  skipBtnText: { color: "#A09A94", fontSize: 13, fontWeight: "600" },

  // Registration upload step
  vehicleSummaryChip: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF0EC", borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#FFD5C2" },
  vehicleSummaryName: { fontSize: 14, fontWeight: "700", color: "#232230" },
  vehicleSummaryPlate: { fontSize: 12, color: "#D4501E", fontWeight: "600", marginTop: 2 },

  uploadBlockLarge: { borderWidth: 2, borderColor: "#D4501E", borderStyle: "dashed", borderRadius: 16, minHeight: 160, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFAF9", marginBottom: 16 },
  uploadBlockDone: { borderColor: "#4CAF50", backgroundColor: "#F8FFF8" },
  uploadPlaceholderLarge: { alignItems: "center", gap: 10, padding: 24 },
  uploadIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF0EC", justifyContent: "center", alignItems: "center" },
  uploadLargeTitle: { fontSize: 16, fontWeight: "700", color: "#D4501E" },
  uploadLargeSub: { fontSize: 12, color: "#A09A94" },
  uploadingState: { alignItems: "center", gap: 10 },
  uploadingText: { fontSize: 14, color: "#D4501E", fontWeight: "600" },

  uploadTips: { backgroundColor: "#F8FFF8", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#C8E6C9", gap: 8, marginBottom: 8 },
  uploadTipsTitle: { fontSize: 12, fontWeight: "700", color: "#2E7D32", marginBottom: 2 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { fontSize: 12, color: "#4CAF50" },
});
