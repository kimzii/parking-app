import React, { useState, useCallback, useEffect } from "react";
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
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { driversService } from "../../src/services/drivers";

const UNSPLASH_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

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

export default function MyVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});

  // Fetch vehicle images from Unsplash when vehicles change
  useEffect(() => {
    if (!UNSPLASH_KEY) return;
    vehicles.forEach(async (v) => {
      if (imageCache[v.id] || (!v.brand && !v.model)) return;
      try {
        const query = [v.color, v.brand, v.model].filter(Boolean).join(" ");
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${UNSPLASH_KEY}`,
        );
        const data = await res.json();
        const imageUrl: string | undefined = data.results?.[0]?.urls?.small;
        if (imageUrl) {
          setImageCache((prev) => ({ ...prev, [v.id]: imageUrl }));
        }
      } catch {
        // silently fail
      }
    });
  }, [vehicles]);

  // Form state
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("CAR");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await driversService.getVehicles();
      setVehicles(data);
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

  const renderVehicleCard = ({ item }: { item: Vehicle }) => (
    <View style={styles.card}>
      {imageCache[item.id] ? (
        <Image
          source={{ uri: imageCache[item.id] }}
          style={styles.cardImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <MaterialIcons
            name={
              item.vehicleType === "MOTORCYCLE"
                ? "two-wheeler"
                : "directions-car"
            }
            size={48}
            color="#aaa"
          />
        </View>
      )}
      <View style={styles.cardDetails}>
        <Text style={styles.cardPlate}>{item.plateNumber}</Text>
        <Text style={styles.cardInfo}>
          {[item.color, item.brand, item.model].filter(Boolean).join(" ") ||
            "No details"}
        </Text>
        <Text style={styles.cardType}>{item.vehicleType || "N/A"}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.plateNumber)}
      >
        <MaterialIcons name="delete-outline" size={22} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Vehicles</Text>
        <TouchableOpacity
          style={styles.addToggle}
          onPress={() => setShowForm(!showForm)}
        >
          <MaterialIcons
            name={showForm ? "close" : "add"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Plate Number *"
            placeholderTextColor="#999"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
            editable={!saving}
          />
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
              >
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
          <TextInput
            style={styles.input}
            placeholder="Brand (e.g. Toyota)"
            placeholderTextColor="#999"
            value={brand}
            onChangeText={setBrand}
            editable={!saving}
          />
          <TextInput
            style={styles.input}
            placeholder="Model (e.g. Camry)"
            placeholderTextColor="#999"
            value={model}
            onChangeText={setModel}
            editable={!saving}
          />
          <TextInput
            style={styles.input}
            placeholder="Color (e.g. Red)"
            placeholderTextColor="#999"
            value={color}
            onChangeText={setColor}
            editable={!saving}
          />
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Vehicle</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#11796F" />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="directions-car" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No vehicles yet</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  addToggle: {
    backgroundColor: "#11796F",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
    color: "#333",
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  typeChipActive: {
    backgroundColor: "#11796F",
    borderColor: "#11796F",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  typeChipTextActive: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#11796F",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#90CAF9",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 100,
    height: 100,
  },
  cardImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardDetails: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  cardPlate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  cardInfo: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  cardType: {
    fontSize: 12,
    color: "#11796F",
    fontWeight: "600",
    marginTop: 4,
  },
  deleteButton: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
