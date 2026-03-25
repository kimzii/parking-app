import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as reviewsService from "../../src/services/reviews";

export default function LeaveReviewScreen() {
  const { reservationId, locationTitle, reviewType } = useLocalSearchParams<{
    reservationId: string;
    locationTitle: string;
    reviewType: "driver" | "host";
  }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRating, setSubmittedRating] = useState(0);

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      if (reviewType === "host") {
        await reviewsService.createHostReview(
          reservationId,
          rating,
          comment.trim() || undefined,
        );
      } else {
        await reviewsService.createDriverReview(
          reservationId,
          rating,
          comment.trim() || undefined,
        );
      }
      setSubmittedRating(rating);
      setSubmitted(true);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to submit review";
      Alert.alert(
        "Error",
        Array.isArray(message) ? message.join(", ") : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Review Submitted" }} />
        <View style={styles.submittedContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="check" size={32} color="#fff" />
          </View>
          <Text style={styles.submittedTitle}>Thank you!</Text>
          <Text style={styles.subtitle}>{locationTitle}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialIcons
                key={star}
                name={star <= submittedRating ? "star" : "star-outline"}
                size={40}
                color={star <= submittedRating ? "#FFB300" : "#D0D0D0"}
              />
            ))}
          </View>
          <Text style={styles.ratingLabel}>{ratingLabels[submittedRating]}</Text>
          <TouchableOpacity
            style={[styles.submitBtn, styles.doneBtn]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Leave a Review" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={reviewType === "host" ? "person" : "local-parking"}
                size={32}
                color="#fff"
              />
            </View>
            <Text style={styles.title}>
              {reviewType === "host"
                ? "Rate this Driver"
                : "Rate your Experience"}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {locationTitle}
            </Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name={star <= rating ? "star" : "star-outline"}
                    size={44}
                    color={star <= rating ? "#FFB300" : "#D0D0D0"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
            )}
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>
              Add a comment (optional)
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder={
                reviewType === "host"
                  ? "How was the driver?"
                  : "How was your parking experience?"
              }
              placeholderTextColor="#aaa"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (rating === 0 || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="rate-review" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D4501E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#232230",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
  },
  ratingSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  ratingLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFB300",
  },
  commentSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#232230",
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#232230",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  charCount: {
    fontSize: 11,
    color: "#C7C7CC",
    textAlign: "right",
    marginTop: 6,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4501E",
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#A8D5D1",
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  skipBtnText: {
    fontSize: 14,
    color: "#A09A94",
    fontWeight: "600",
  },
  submittedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  submittedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#232230",
    marginTop: 4,
  },
  doneBtn: {
    alignSelf: "stretch",
  },
});
