import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, CheckCircle2, Calendar } from 'lucide-react-native';
import { COLORS, FONT, SPACING, RADIUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Election = {
  id: string;
  org_id: string;
  title: string;
  description: string;
  voting_start: string;
  voting_end: string;
  status: string;
  results_published: boolean;
};

type Candidate = {
  id: string;
  election_id: string;
  user_id: string;
  position: string;
  manifesto: string;
  vote_count: number;
  user_name?: string;
};

type Tab = 'active' | 'upcoming' | 'past';

export default function OrganizationElectionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [votedElections, setVotedElections] = useState<Set<string>>(new Set());
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || !session?.user) return;

    setLoading(true);
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', id)
        .single();

      if (org) setOrgName(org.name);

      const { data: electionsData } = await supabase
        .from('org_elections')
        .select('*')
        .eq('org_id', id)
        .order('voting_start', { ascending: false });

      if (electionsData) {
        setElections(electionsData);

        const activeElectionIds = electionsData
          .filter(e => e.status === 'active')
          .map(e => e.id);

        if (activeElectionIds.length > 0) {
          const { data: candidatesData } = await supabase
            .from('org_election_candidates')
            .select('*, users:user_id(name)')
            .in('election_id', activeElectionIds);

          if (candidatesData) {
            const enrichedCandidates = candidatesData.map(c => ({
              ...c,
              user_name: (c.users as any)?.name || 'Unknown',
            }));
            setCandidates(enrichedCandidates);
          }

          const { data: votesData } = await supabase
            .from('org_election_votes')
            .select('election_id')
            .in('election_id', activeElectionIds)
            .eq('voter_hash', `${session.user.id}-${activeElectionIds[0]}`);

          if (votesData) {
            setVotedElections(new Set(votesData.map(v => v.election_id)));
          }
        }
      }
    } catch (error) {
      console.error('Error loading elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `Voting ends in ${days}d ${hours}h`;
  };

  const getTimeUntilStart = (startDate: string) => {
    const start = new Date(startDate);
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCastVote = async (election: Election) => {
    if (!session?.user) return;

    const electionCandidates = candidates.filter(c => c.election_id === election.id);
    const positions = [...new Set(electionCandidates.map(c => c.position))];

    const allPositionsFilled = positions.every(pos => selectedCandidates[pos]);

    if (!allPositionsFilled) {
      Alert.alert('Incomplete Vote', 'Please select a candidate for each position.');
      return;
    }

    setSubmitting(true);
    try {
      const voterHash = `${session.user.id}-${election.id}`;

      const votesToInsert = Object.values(selectedCandidates).map(candidateId => ({
        election_id: election.id,
        candidate_id: candidateId,
        voter_hash: voterHash,
      }));

      const { error: voteError } = await supabase
        .from('org_election_votes')
        .insert(votesToInsert);

      if (voteError) throw voteError;

      for (const candidateId of Object.values(selectedCandidates)) {
        const { error: updateError } = await supabase.rpc('increment_vote_count', {
          candidate_id: candidateId,
        });

        if (updateError) {
          const { data: candidate } = await supabase
            .from('org_election_candidates')
            .select('vote_count')
            .eq('id', candidateId)
            .single();

          await supabase
            .from('org_election_candidates')
            .update({ vote_count: (candidate?.vote_count || 0) + 1 })
            .eq('id', candidateId);
        }
      }

      setVotedElections(prev => new Set(prev).add(election.id));
      setSelectedCandidates({});
      Alert.alert('Success', 'Your vote has been cast successfully!');
      loadData();
    } catch (error) {
      console.error('Error casting vote:', error);
      Alert.alert('Error', 'Failed to cast vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCandidatesByPosition = (election: Election) => {
    const electionCandidates = candidates.filter(c => c.election_id === election.id);
    const positions = [...new Set(electionCandidates.map(c => c.position))];
    const hasVoted = votedElections.has(election.id);

    return (
      <View style={styles.candidatesContainer}>
        {positions.map(position => (
          <View key={position} style={styles.positionSection}>
            <Text style={styles.positionHeading}>{position}</Text>
            {electionCandidates
              .filter(c => c.position === position)
              .map(candidate => (
                <TouchableOpacity
                  key={candidate.id}
                  style={[
                    styles.candidateCard,
                    selectedCandidates[position] === candidate.id && styles.candidateCardSelected,
                  ]}
                  onPress={() => {
                    if (!hasVoted) {
                      setSelectedCandidates(prev => ({
                        ...prev,
                        [position]: candidate.id,
                      }));
                    }
                  }}
                  disabled={hasVoted}
                >
                  <View style={styles.candidateHeader}>
                    <View style={styles.radioOuter}>
                      {selectedCandidates[position] === candidate.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.candidateName}>{candidate.user_name}</Text>
                  </View>
                  <Text style={styles.manifesto} numberOfLines={2}>
                    {candidate.manifesto}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        ))}
      </View>
    );
  };

  const renderActiveElections = () => {
    const activeElections = elections.filter(e => e.status === 'active');

    if (activeElections.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active elections</Text>
        </View>
      );
    }

    return (
      <View>
        {activeElections.map(election => {
          const hasVoted = votedElections.has(election.id);
          return (
            <View key={election.id} style={styles.electionCard}>
              <Text style={styles.electionTitle}>{election.title}</Text>
              <Text style={styles.electionDescription}>{election.description}</Text>

              <View style={styles.countdownContainer}>
                <Clock size={16} color={COLORS.primary} />
                <Text style={styles.countdown}>{getTimeRemaining(election.voting_end)}</Text>
              </View>

              {hasVoted && (
                <View style={styles.votedBadge}>
                  <CheckCircle2 size={16} color={COLORS.success} />
                  <Text style={styles.votedText}>Already Voted</Text>
                </View>
              )}

              {renderCandidatesByPosition(election)}

              {!hasVoted && (
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    submitting && styles.voteButtonDisabled,
                  ]}
                  onPress={() => handleCastVote(election)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.voteButtonText}>Cast Vote</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderUpcomingElections = () => {
    const upcomingElections = elections.filter(e => e.status === 'upcoming');

    if (upcomingElections.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No upcoming elections</Text>
        </View>
      );
    }

    return (
      <View>
        {upcomingElections.map(election => (
          <View key={election.id} style={styles.electionCard}>
            <Text style={styles.electionTitle}>{election.title}</Text>
            <Text style={styles.electionDescription}>{election.description}</Text>
            <View style={styles.startDateContainer}>
              <Calendar size={16} color={COLORS.textSecondary} />
              <Text style={styles.startDate}>
                Voting starts {getTimeUntilStart(election.voting_start)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPastElections = () => {
    const pastElections = elections.filter(e => e.status === 'completed');

    if (pastElections.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No past elections</Text>
        </View>
      );
    }

    return (
      <View>
        {pastElections.map(election => (
          <View key={election.id} style={styles.electionCard}>
            <Text style={styles.electionTitle}>{election.title}</Text>
            {election.results_published ? (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsHeading}>Results</Text>
                {candidates
                  .filter(c => c.election_id === election.id)
                  .sort((a, b) => b.vote_count - a.vote_count)
                  .map(candidate => {
                    const totalVotes = candidates
                      .filter(c => c.election_id === election.id && c.position === candidate.position)
                      .reduce((sum, c) => sum + c.vote_count, 0);
                    const percentage = totalVotes > 0 ? (candidate.vote_count / totalVotes) * 100 : 0;

                    return (
                      <View key={candidate.id} style={styles.resultItem}>
                        <Text style={styles.resultName}>{candidate.user_name}</Text>
                        <Text style={styles.resultPosition}>{candidate.position}</Text>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                        </View>
                        <Text style={styles.resultVotes}>
                          {candidate.vote_count} votes ({percentage.toFixed(1)}%)
                        </Text>
                      </View>
                    );
                  })}
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Results Pending</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Elections</Text>
          <Text style={styles.headerSubtitle}>{orgName}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <>
            {activeTab === 'active' && renderActiveElections()}
            {activeTab === 'upcoming' && renderUpcomingElections()}
            {activeTab === 'past' && renderPastElections()}
          </>
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
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  loader: {
    marginTop: SPACING.xl,
  },
  electionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  electionTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  electionDescription: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  countdown: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  votedText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  candidatesContainer: {
    marginTop: SPACING.sm,
  },
  positionSection: {
    marginBottom: SPACING.md,
  },
  positionHeading: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  candidateCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  candidateCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  candidateName: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: COLORS.textPrimary,
  },
  manifesto: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginLeft: 32,
  },
  voteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  voteButtonDisabled: {
    opacity: 0.6,
  },
  voteButtonText: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: COLORS.white,
  },
  startDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startDate: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  resultsContainer: {
    marginTop: SPACING.sm,
  },
  resultsHeading: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  resultItem: {
    marginBottom: SPACING.md,
  },
  resultName: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: COLORS.textPrimary,
  },
  resultPosition: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  resultVotes: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  pendingBadge: {
    backgroundColor: COLORS.textSecondary + '20',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
  },
  pendingText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: COLORS.textSecondary,
  },
});
