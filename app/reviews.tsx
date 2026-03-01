import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, ThumbsUp, CheckCircle2 } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Review {
  id: string;
  hostel_id: string;
  user_id: string;
  booking_id: string | null;
  rating: number;
  title: string;
  pros: string;
  cons: string;
  photos: string[];
  is_verified_stay: boolean;
  helpful_count: number;
  created_at: string;
  members: {
    full_name: string;
  };
}

export default function ReviewsScreen() {
  const router = useRouter();
  const { hostelId } = useLocalSearchParams();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [hasUserBooking, setHasUserBooking] = useState(false);

  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    pros: '',
    cons: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
    if (hostelId && user) {
      checkUserBooking();
    }
  }, [hostelId, filterRating]);

  const checkUserBooking = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('hostel_id', hostelId)
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasUserBooking(true);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);

    let query = supabase
      .from('hostel_reviews_verified')
      .select(`
        *,
        members (
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (hostelId) {
      query = query.eq('hostel_id', hostelId);
    } else if (user) {
      const { data: userBookings } = await supabase
        .from('bookings')
        .select('hostel_id')
        .eq('user_id', user.id);

      if (userBookings && userBookings.length > 0) {
        const hostelIds = userBookings.map((b) => b.hostel_id);
        query = query.in('hostel_id', hostelIds);
      }
    }

    if (filterRating !== null) {
      query = query.eq('rating', filterRating);
    }

    const { data, error } = await query;

    if (!error && data) {
      setReviews(data as Review[]);
    }

    setLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to write a review');
      return;
    }

    if (!hostelId) {
      Alert.alert('Error', 'Hostel ID is required to submit a review');
      return;
    }

    if (newReview.rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!newReview.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('hostel_reviews_verified').insert({
      hostel_id: hostelId,
      user_id: user.id,
      rating: newReview.rating,
      title: newReview.title,
      pros: newReview.pros,
      cons: newReview.cons,
      photos: [],
      is_verified_stay: hasUserBooking,
      helpful_count: 0,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Failed to submit review');
      return;
    }

    Alert.alert('Success', 'Review submitted successfully');
    setNewReview({ rating: 0, title: '', pros: '', cons: '' });
    setShowWriteReview(false);
    fetchReviews();
  };

  const handleHelpfulVote = async (reviewId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to vote');
      return;
    }

    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    const { error } = await supabase
      .from('hostel_reviews_verified')
      .update({ helpful_count: review.helpful_count + 1 })
      .eq('id', reviewId);

    if (!error) {
      fetchReviews();
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      distribution[review.rating - 1]++;
    });
    return distribution;
  };

  const renderStars = (rating: number, size = 16, color = COLORS.gold) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            fill={star <= rating ? color : 'transparent'}
            color={star <= rating ? color : COLORS.border}
          />
        ))}
      </View>
    );
  };

  const renderTappableStars = () => {
    return (
      <View style={styles.tappableStarsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setNewReview({ ...newReview, rating: star })}
            style={styles.starButton}
          >
            <Star
              size={32}
              fill={star <= newReview.rating ? COLORS.gold : 'transparent'}
              color={star <= newReview.rating ? COLORS.gold : COLORS.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingDistribution = () => {
    const distribution = getRatingDistribution();
    const maxCount = Math.max(...distribution);

    return (
      <View style={styles.distributionContainer}>
        <Text style={styles.sectionTitle}>Rating Distribution</Text>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = distribution[rating - 1];
          const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

          return (
            <View key={rating} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{rating} star</Text>
              <View style={styles.distributionBarContainer}>
                <View
                  style={[
                    styles.distributionBar,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderReviewCard = (review: Review) => {
    return (
      <View key={review.id} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewHeaderLeft}>
            <Text style={styles.reviewerName}>{review.members.full_name}</Text>
            {review.is_verified_stay && (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={14} color={COLORS.success} />
                <Text style={styles.verifiedText}>Verified Stay</Text>
              </View>
            )}
          </View>
          {renderStars(review.rating)}
        </View>

        <Text style={styles.reviewTitle}>{review.title}</Text>

        {review.pros && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionLabel}>Pros:</Text>
            <Text style={styles.reviewSectionText}>{review.pros}</Text>
          </View>
        )}

        {review.cons && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionLabel}>Cons:</Text>
            <Text style={styles.reviewSectionText}>{review.cons}</Text>
          </View>
        )}

        {review.photos && review.photos.length > 0 && (
          <View style={styles.photosPlaceholder}>
            <Text style={styles.photosPlaceholderText}>
              {review.photos.length} photo{review.photos.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.helpfulButton}
          onPress={() => handleHelpfulVote(review.id)}
        >
          <ThumbsUp size={16} color={COLORS.textSecondary} />
          <Text style={styles.helpfulText}>
            Helpful ({review.helpful_count})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWriteReviewForm = () => {
    return (
      <View style={styles.writeReviewForm}>
        <Text style={styles.formTitle}>Write a Review</Text>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Rating *</Text>
          {renderTappableStars()}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Summary of your experience"
            placeholderTextColor={COLORS.textTertiary}
            value={newReview.title}
            onChangeText={(text) => setNewReview({ ...newReview, title: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Pros</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did you like?"
            placeholderTextColor={COLORS.textTertiary}
            value={newReview.pros}
            onChangeText={(text) => setNewReview({ ...newReview, pros: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Cons</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What could be improved?"
            placeholderTextColor={COLORS.textTertiary}
            value={newReview.cons}
            onChangeText={(text) => setNewReview({ ...newReview, cons: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        {hasUserBooking && (
          <View style={styles.autoVerifiedNotice}>
            <CheckCircle2 size={16} color={COLORS.success} />
            <Text style={styles.autoVerifiedText}>
              This review will be marked as verified stay
            </Text>
          </View>
        )}

        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowWriteReview(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitReview}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.averageRating}>{calculateAverageRating()}</Text>
          {renderStars(Math.round(parseFloat(calculateAverageRating())), 20)}
          <Text style={styles.reviewCount}>
            Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {renderRatingDistribution()}

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by rating:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterRating === null && styles.filterChipActive,
              ]}
              onPress={() => setFilterRating(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterRating === null && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {[5, 4, 3, 2, 1].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.filterChip,
                  filterRating === rating && styles.filterChipActive,
                ]}
                onPress={() => setFilterRating(rating)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterRating === rating && styles.filterChipTextActive,
                  ]}
                >
                  {rating} Star
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {hostelId && (
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => setShowWriteReview(!showWriteReview)}
          >
            <Text style={styles.writeReviewButtonText}>
              {showWriteReview ? 'Cancel' : 'Write a Review'}
            </Text>
          </TouchableOpacity>
        )}

        {showWriteReview && renderWriteReviewForm()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((review) => renderReviewCard(review))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    margin: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  averageRating: {
    fontSize: 48,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  reviewCount: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  distributionContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  distributionLabel: {
    width: 60,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.xs,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.xs,
  },
  distributionCount: {
    width: 30,
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  writeReviewButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  writeReviewButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  writeReviewForm: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tappableStarsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  starButton: {
    padding: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  autoVerifiedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.borderLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  autoVerifiedText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.success,
  },
  formActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  reviewsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  reviewHeaderLeft: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.success,
  },
  reviewTitle: {
    fontSize: 15,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  reviewSection: {
    marginBottom: SPACING.sm,
  },
  reviewSectionLabel: {
    fontSize: 13,
    fontFamily: FONT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  reviewSectionText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  photosPlaceholder: {
    backgroundColor: COLORS.borderLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  photosPlaceholderText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: SPACING.sm,
  },
  helpfulText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
});