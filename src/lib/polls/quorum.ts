import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface PollResult {
  isQuorumReached: boolean;
  quorumPercentage: number;
  totalVotedArea: number;
  totalVotedApartments: number;
  optionResults: Array<{
    optionId: string;
    optionText: string;
    areaVotes: number;
    areaPercentage: number;
    countVotes: number;
  }>;
}

export async function calculatePollResults(pollId: string): Promise<PollResult> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: true,
      votes: true,
    },
  });

  if (!poll) throw new Error('Poll not found');

  const totalVotedArea = poll.votes.reduce((acc, vote) => acc + vote.squareMeters, 0);
  const totalVotedApartments = poll.votes.length;

  const quorumPercentage = poll.quorumType === 'BY_AREA'
    ? (totalVotedArea / poll.totalBuildingArea) * 100
    : (totalVotedApartments / poll.totalApartments) * 100;

  const isQuorumReached = quorumPercentage >= poll.quorumThreshold;

  const optionResults = poll.options.map((option) => {
    const optionVotes = poll.votes.filter((v) => v.optionId === option.id);
    const areaVotes = optionVotes.reduce((acc, v) => acc + v.squareMeters, 0);

    return {
      optionId: option.id,
      optionText: option.text,
      areaVotes,
      areaPercentage: totalVotedArea > 0 ? (areaVotes / totalVotedArea) * 100 : 0,
      countVotes: optionVotes.length,
    };
  });

  return {
    isQuorumReached,
    quorumPercentage: Number(quorumPercentage.toFixed(2)),
    totalVotedArea,
    totalVotedApartments,
    optionResults,
  };
}

/**
 * Генерация неизменяемого подписи-хеша для каждого голоса
 */
export function generateVoteHash(payload: {
  pollId: string;
  optionId: string;
  voterIin: string;
  squareMeters: number;
  timestamp: string;
}): string {
  const secret = process.env.VOTE_SIGNING_SECRET || 'fixly-default-secret';
  const data = `${payload.pollId}:${payload.optionId}:${payload.voterIin}:${payload.squareMeters}:${payload.timestamp}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}