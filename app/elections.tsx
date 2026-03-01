import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Users, TrendingUp, CheckCircle, Award } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Election {
  id: string;
  hall_id: string;
  title: string;
  description: string;
  position: string;
  nominations_open: string;
  nominations_close: string;
  voting_start: string;
  voting_end: string;
  status: string;
}

interface Candidate {
  id: string;
  election_id: string;
  user_id: string;
  manifesto: string;
  photo_url: string;
  status: string;
  vote_count: number;
  name: string;
}

interface Vote {
  election_id: string;
  candidate_id: string;
}

export default function ElectionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [userVotes, setUserVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [nominating, setNominating] = useState(false);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const { data: electionsData, error: electionsError } = await supabase
        .from('hall_elections')
        .select('*')
        .order('voting_start', { ascending: false });

      if (electionsError) throw electionsError;

      setElections(electionsData || []);

      if (user) {
        const { data: votesData } = await supabase
          .from('election_votes')
          .select('election_id, candidate_id')
          .eq('voter_id', user.id);

        setUserVotes(votesData || []);
      }
    } catch (error) {
      console.error('Error loading elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async (electionId: string) => {
    try {
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('election_candidates')
        .select('*')
        .eq('election_id', electionId)
        .eq('status', 'approved')
        .order('vote_count', { ascending: false });

      if (candidatesError) throw candidatesError;

      const candidatesWithNames = await Promise.all(
        (candidatesData || []).map(async (candidate) => {
          const { data: memberData } = await supabase
            .from('members')
            .select('name')
            .eq('user_id', candidate.user_id)
            .single();

          return {
            ...candidate,
            name: memberData?.name || 'Unknown',
          };
        })
      );

      setCandidates(candidatesWithNames);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const handleElectionPress = (election: Election) => {
    setSelectedElection(election);
    loadCandidates(election.id);
  };

  const handleVote = async (candidateId: string) => {
    if (!user || !selectedElection || voting) return;

    const hasVoted = userVotes.some(v => v.election_id === selectedElection.id);
    if (hasVoted) return;

    setVoting(true);
    try {
      const { error: voteError } = await supabase
        .from('election_votes')
        .insert({
          election_id: selectedElection.id,
          voter_id: user.id,
          candidate_id: candidateId,
        });

      if (voteError) throw voteError;

      const { error: updateError } = await supabase.rpc('increment_vote_count', {
        candidate_id_param: candidateId,
      });

      if (updateError) {
        const { error: fallbackError } = await supabase
          .from('election_candidates')
          .update({ vote_count: supabase.sql`vote_count + 1` })
          .eq('id', candidateId);

        if (fallbackError) throw fallbackError;
      }

      setUserVotes([...userVotes, { election_id: selectedElection.id, candidate_id: candidateId }]);
      await loadCandidates(selectedElection.id);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
    }
  };

  const handleNominate = async () => {
    if (!user || !selectedElection || nominating) return;

    setNominating(true);
    try {
      const { error } = await supabase
        .from('election_candidates')
        .insert({
          election_id: selectedElection.id,
          user_id: user.id,
          manifesto: '',
          status: 'nominated',
          vote_count: 0,
        });

      if (error) throw error;

      await loadCandidates(selectedElection.id);
    } catch (error) {
      console.error('Error nominating:', error);
    } finally {
      setNominating(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadElections();
    if (selectedElection) {
      await loadCandidates(selectedElection.id);
    }
    setRefreshing(false);
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const nomOpen = new Date(election.nominations_open);
    const nomClose = new Date(election.nominations_close);
    const voteStart = new Date(election.voting_start);
    const voteEnd = new Date(election.voting_end);

    if (election.status === 'cancelled') return 'Cancelled';
    if (election.status === 'completed' || now > voteEnd) return 'Completed';
    if (now >= voteStart && now <= voteEnd) return 'Voting';
    if (now >= nomOpen && now < nomClose) return 'Nominations';
    if (now < nomOpen) return 'Upcoming';
    if (now >= nomClose && now < voteStart) return 'Pending';
    return 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Voting':
        return COLORS.primary;
      case 'Nominations':
        return COLORS.accent;
      case 'Completed':
        return COLORS.success;
      case 'Cancelled':
        return COLORS.error;
      case 'Pending':
        return COLORS.warning;
      default:
        return COLORS.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const hasUserVoted = (electionId: string) => {
    return userVotes.some(v => v.election_id === electionId);
  };

  const getUserVotedCandidate = (electionId: string) => {
    return userVotes.find(v => v.election_id === electionId)?.candidate_id;
  };

  const isUserNominated = (electionId: string) => {
    return candidates.some(c => c.user_id === user?.id && c.election_id === electionId);
  };

  const getTotalVotes = () => {
    return candidates.reduce((sum, c) => sum + c.vote_count, 0);
  };

  const getVotePercentage = (voteCount: number) => {
    const total = getTotalVotes();
    return total > 0 ? (voteCount / total) * 100 : 0;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Elections</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (selectedElection) {
    const status = getElectionStatus(selectedElection);
    const hasVoted = hasUserVoted(selectedElection.id);
    const votedCandidateId = getUserVotedCandidate(selectedElection.id);
    const isVotingOpen = status === 'Voting';
    const isNominationsOpen = status === 'Nominations';
    const isCompleted = status === 'Completed';
    const showResults = isCompleted || hasVoted;
    const userNominated = isUserNominated(selectedElection.id);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedElection(null)} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedElection.title}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.electionDetailCard}>
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                <Text style={styles.statusBadgeText}>{status}</Text>
              </View>
            </View>
            <Text style={styles.electionDetailTitle}>{selectedElection.title}</Text>
            <Text style={styles.electionDetailPosition}>{selectedElection.position}</Text>
            {selectedElection.description && (
              <Text style={styles.electionDetailDescription}>{selectedElection.description}</Text>
            )}

            <View style={styles.dateRow}>
              <Calendar size={16} color={COLORS.textSecondary} />
              <Text style={styles.dateText}>
                Voting: {formatDate(selectedElection.voting_start)} - {formatDate(selectedElection.voting_end)}
              </Text>
            </View>
          </View>

          {isNominationsOpen && !userNominated && (
            <TouchableOpacity
              style={styles.nominateButton}
              onPress={handleNominate}
              disabled={nominating}
            >
              {nominating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Award size={20} color={COLORS.white} />
                  <Text style={styles.nominateButtonText}>Nominate Yourself</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {showResults && candidates.length > 0 && (
            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>Results</Text>
              <View style={styles.totalVotesRow}>
                <Users size={16} color={COLORS.textSecondary} />
                <Text style={styles.totalVotesText}>{getTotalVotes()} total votes</Text>
              </View>
            </View>
          )}

          <View style={styles.candidatesSection}>
            <Text style={styles.sectionTitle}>
              Candidates ({candidates.length})
            </Text>

            {candidates.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyStateText}>No candidates yet</Text>
              </View>
            ) : (
              candidates.map(candidate => {
                const votePercentage = getVotePercentage(candidate.vote_count);
                const isVotedFor = votedCandidateId === candidate.id;

                return (
                  <View
                    key={candidate.id}
                    style={[
                      styles.candidateCard,
                      isVotedFor && styles.candidateCardVoted,
                    ]}
                  >
                    <View style={styles.candidateHeader}>
                      <View style={styles.candidatePhotoContainer}>
                        {candidate.photo_url ? (
                          <Image source={{ uri: candidate.photo_url }} style={styles.candidatePhoto} />
                        ) : (
                          <View style={styles.candidatePhotoPlaceholder}>
                            <Text style={styles.candidateInitial}>
                              {candidate.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.candidateInfo}>
                        <Text style={styles.candidateName}>{candidate.name}</Text>
                        {showResults && (
                          <View style={styles.voteInfoRow}>
                            <TrendingUp size={14} color={COLORS.primary} />
                            <Text style={styles.voteCount}>
                              {candidate.vote_count} votes ({votePercentage.toFixed(1)}%)
                            </Text>
                          </View>
                        )}
                      </View>

                      {isVotedFor && (
                        <View style={styles.votedBadge}>
                          <CheckCircle size={20} color={COLORS.success} />
                        </View>
                      )}
                    </View>

                    {candidate.manifesto && (
                      <Text style={styles.manifesto}>{candidate.manifesto}</Text>
                    )}

                    {showResults && (
                      <View style={styles.voteBarContainer}>
                        <View
                          style={[
                            styles.voteBar,
                            { width: `${votePercentage}%` },
                          ]}
                        />
                      </View>
                    )}

                    {isVotingOpen && !hasVoted && (
                      <TouchableOpacity
                        style={styles.voteButton}
                        onPress={() => handleVote(candidate.id)}
                        disabled={voting}
                      >
                        {voting ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.voteButtonText}>Vote</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Elections</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {elections.length === 0 ? (
          <View style={styles.emptyState}>
            <Award size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyStateText}>No elections available</Text>
          </View>
        ) : (
          elections.map(election => {
            const status = getElectionStatus(election);
            const hasVoted = hasUserVoted(election.id);

            return (
              <TouchableOpacity
                key={election.id}
                style={styles.electionCard}
                onPress={() => handleElectionPress(election)}
              >
                <View style={styles.electionCardHeader}>
                  <Text style={styles.electionTitle}>{election.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                    <Text style={styles.statusBadgeText}>{status}</Text>
                  </View>
                </View>

                <Text style={styles.electionPosition}>{election.position}</Text>

                <View style={styles.electionFooter}>
                  <View style={styles.dateRow}>
                    <Calendar size={14} color={COLORS.textSecondary} />
                    <Text style={styles.electionDateText}>
                      {formatDate(election.voting_start)} - {formatDate(election.voting_end)}
                    </Text>
                  </View>

                  {hasVoted && (
                    <View style={styles.votedIndicator}>
                      <CheckCircle size={16} color={COLORS.success} />
                      <Text style={styles.votedText}>Voted</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
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
    color: COLORS.navy,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textTertiary,
    marginTop: SPACING.md,
  },
  electionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  electionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  electionTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  electionPosition: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  electionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  electionDateText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  votedText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.success,
  },
  electionDetailCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  electionDetailTitle: {
    fontSize: 20,
    fontFamily: FONT.heading,
    color: COLORS.navy,
    marginBottom: SPACING.xs,
  },
  electionDetailPosition: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  electionDetailDescription: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  dateText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
  },
  nominateButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  nominateButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
  resultsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultsTitle: {
    fontSize: 18,
    fontFamily: FONT.semiBold,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
  },
  totalVotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  totalVotesText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  candidatesSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  candidateCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  candidateCardVoted: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  candidatePhotoContainer: {
    marginRight: SPACING.md,
  },
  candidatePhoto: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
  },
  candidatePhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candidateInitial: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  voteInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  voteCount: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
  },
  votedBadge: {
    marginLeft: SPACING.sm,
  },
  manifesto: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  voteBarContainer: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.xs,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  voteBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xs,
  },
  voteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButtonText: {
    fontSize: 16,
    fontFamily: FONT.semiBold,
    color: COLORS.white,
  },
});
