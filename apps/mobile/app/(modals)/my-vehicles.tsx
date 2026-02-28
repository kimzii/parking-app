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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { driversService } from "../../src/services/drivers";
import { userService } from "../../src/services/user";
import { VehicleSvg } from "../../src/components/VehicleSvg";

type Vehicle = {
  id: string;
  plateNumber: string;
  vehicleType: string;
  brand: string;
  model: string;
  color: string;
  isActive: boolean;
};

const VEHICLE_TYPES = ["CAR", "MOTORCYCLE", "SUV"] as const;

const TYPE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CAR: "directions-car",
  MOTORCYCLE: "two-wheeler",
  SUV: "directions-car",
};

export default function MyVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
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
      const verified = profile.roleStatuses?.some(
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
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (vehicle: Vehicle) => {
    setPlateNumber(vehicle.plateNumber || "");
    setVehicleType(vehicle.vehicleType || "CAR");
    setBrand(vehicle.brand || "");
    setModel(vehicle.model || "");
    setColor(vehicle.color || "");
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleAdd = async () => {
    if (!plateNumber.trim()) {
      Alert.alert("Error", "Plate number is required.");
      return;
    }
    setSaving(true);
    try {
      await driversService.addVehicle({
        plateNumber: plateNumber.trim(),
        vehicleType,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
      });
      Alert.alert("Success", "Vehicle added!");
      resetForm();
      setShowForm(false);
      fetchVehicles();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to add vehicle.",
      );
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
      setShowForm(false);
      fetchVehicles();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to update vehicle.",
      );
    } finally {
      setSaving(false);
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

  const renderVehicleCard = ({ item }: { item: Vehicle }) => {
    const details = [item.brand, item.model].filter(Boolean).join(" ");
    return (
      <View style={styles.card}>
        <View
          style={[
            styles.cardSvgContainer,
            { backgroundColor: (item.color || "#11796F") + "12" },
          ]}
        >
          <VehicleSvg
            type={item.vehicleType}
            color={item.color || "#11796F"}
            size={52}
          />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{item.plateNumber}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditForm(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="edit" size={18} color="#11796F" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id, item.plateNumber)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="delete-outline" size={18} color="#E53935" />
              </TouchableOpacity>
            </View>
          </View>
          {details ? (
            <Text style={styles.cardDetails}>{details}</Text>
          ) : null}
          <View style={styles.cardBottomRow}>
            {item.color ? (
              <View style={styles.colorTag}>
                <View
                  style={[styles.colorDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.colorText}>{item.color}</Text>
              </View>
            ) : null}
            <View style={styles.typeTag}>
              <MaterialIcons
                name={TYPE_ICONS[item.vehicleType] || "directions-car"}
                size={14}
                color="#11796F"
              />
              <Text style={styles.typeTagText}>
                {item.vehicleType || "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const isEditing = !!editingVehicle;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Vehicles</Text>
          <Text style={styles.subtitle}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}{" "}
            registered
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addToggle,
            showForm && styles.addToggleActive,
            !isDriverVerified && styles.addToggleDisabled,
          ]}
          onPress={() =>
            !isDriverVerified
              ? router.push("/(modals)/driver-verification")
              : showForm
                ? handleCloseForm()
                : openAddForm()
          }
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={!isDriverVerified ? "lock" : showForm ? "close" : "add"}
            size={22}
            color={!isDriverVerified ? "#fff" : showForm ? "#11796F" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {!isDriverVerified && (
        <TouchableOpacity
          style={styles.verifyBanner}
          onPress={() => router.push("/(modals)/driver-verification")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="verified-user" size={20} color="#F57C00" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyBannerTitle}>
              Verification required
            </Text>
            <Text style={styles.verifyBannerText}>
              Verify your driver account to add and manage vehicles.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#F57C00" />
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {isEditing ? "Edit Vehicle" : "Add New Vehicle"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Plate Number *"
            placeholderTextColor="#aaa"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
            editable={!saving}
          />
          <Text style={styles.fieldLabel}>Vehicle Type</Text>
          <View style={styles.typeRow}>
            {VEHICLE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  vehicleType === t && styles.typeChipActive,
                ]}
                onPress={() => setVehicleType(t)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={TYPE_ICONS[t] || "directions-car"}
                  size={18}
                  color={vehicleType === t ? "#fff" : "#888"}
                  style={{ marginBottom: 2 }}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    vehicleType === t && styles.typeChipTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Brand"
              placeholderTextColor="#aaa"
              value={brand}
              onChangeText={setBrand}
              editable={!saving}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Model"
              placeholderTextColor="#aaa"
              value={model}
              onChangeText={setModel}
              editable={!saving}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Color (e.g. Red, Blue)"
            placeholderTextColor="#aaa"
            value={color}
            onChangeText={setColor}
            editable={!saving}
          />
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={isEditing ? handleUpdate : handleAdd}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitInner}>
                <MaterialIcons
                  name={isEditing ? "check-circle-outline" : "add-circle-outline"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Update Vehicle" : "Add Vehicle"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity
              style={styles.cancelFormButton}
              onPress={handleCloseForm}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#11796F" />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="directions-car" size={48} color="#11796F" />
          </View>
          <Text style={styles.emptyTitle}>No vehicles yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to add your first vehicle
          </Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A2E", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  addToggle: {
    backgroundColor: "#11796F", width: 44, height: 44, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  addToggleActive: { backgroundColor: "#E8F5F3", shadowOpacity: 0, elevation: 0 },
  addToggleDisabled: { backgroundColor: "#B0BEC5", shadowOpacity: 0, elevation: 0 },
  form: {
    backgroundColor: "#fff", marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  formTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 },
  fieldLabel: {
    fontSize: 13, fontWeight: "600", color: "#8E8E93", marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5, borderColor: "#E8ECF0", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    backgroundColor: "#F8FAFB", color: "#1A1A2E", marginBottom: 12,
  },
  inputRow: { flexDirection: "row", gap: 10 },
  inputHalf: { flex: 1 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  typeChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: "#E8ECF0", alignItems: "center", backgroundColor: "#F8FAFB",
  },
  typeChipActive: { backgroundColor: "#11796F", borderColor: "#11796F" },
  typeChipText: { fontSize: 11, fontWeight: "700", color: "#8E8E93", letterSpacing: 0.3 },
  typeChipTextActive: { color: "#fff" },
  submitButton: {
    backgroundColor: "#11796F", paddingVertical: 15, borderRadius: 12, alignItems: "center", marginTop: 4,
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelFormButton: {
    paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 8, backgroundColor: "#F2F2F7",
  },
  cancelFormText: { color: "#8E8E93", fontSize: 15, fontWeight: "600" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingBottom: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: "#E8F5F3",
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  emptySubtitle: { fontSize: 14, color: "#8E8E93" },
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  card: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardSvgContainer: { width: 88, justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  plateBadge: { backgroundColor: "#1A1A2E", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  plateText: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  cardActions: { flexDirection: "row", gap: 6 },
  editBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "#E8F5F3",
    justifyContent: "center", alignItems: "center",
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "#FEE8E7",
    justifyContent: "center", alignItems: "center",
  },
  cardDetails: { fontSize: 15, fontWeight: "600", color: "#1A1A2E", marginTop: 6 },
  cardBottomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  colorTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F2F2F7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  colorText: { fontSize: 12, fontWeight: "600", color: "#555", textTransform: "capitalize" },
  typeTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5F3", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  typeTagText: { fontSize: 12, fontWeight: "600", color: "#11796F" },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#F57C00",
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F57C00",
  },
  verifyBannerText: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
});
