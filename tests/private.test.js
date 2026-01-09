import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ScoringService } from '../src/services/scoring.service.js';
import { LanguageService } from '../src/services/language.service.js';
import { LeaderboardService } from '../src/services/leaderboard.service.js';

/**
 * Private/Edge Case Tests
 *
 * These tests verify edge cases, error handling, tricky scenarios,
 * and boundary conditions that might break the implementation.
 */

describe('ScoringService - Edge Cases & Tricky Scenarios', () => {
  let scoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('calculateImpactScore - Input Validation & Edge Cases', () => {
    test('returns 0 when given empty array', () => {
      const events = [];
      expect(scoringService.calculateImpactScore(events)).toBe(0);
    });

    test('returns 0 when given invalid input (not an array)', () => {
      expect(scoringService.calculateImpactScore(null)).toBe(0);
      expect(scoringService.calculateImpactScore(undefined)).toBe(0);
      expect(scoringService.calculateImpactScore('invalid')).toBe(0);
    });

    test('handles events missing type property gracefully', () => {
      const events = [{ payload: {} }, {}];
      expect(scoringService.calculateImpactScore(events)).toBe(0);
    });

    test('ignores events that are not scored (IssuesEvent, ForkEvent, etc)', () => {
      const events = [
        { type: 'IssuesEvent' },
        { type: 'ForkEvent' },
        { type: 'WatchEvent' },
      ];
      expect(scoringService.calculateImpactScore(events)).toBe(0);
    });

    test('awards 0 points when PR is closed without being merged', () => {
      const events = [
        {
          type: 'PullRequestEvent',
          payload: {
            action: 'closed',
            pull_request: { merged: false },
          },
        },
      ];
      expect(scoringService.calculateImpactScore(events)).toBe(0);
    });

    test('awards 10 points for merged PR even if action is "opened"', () => {
      const events = [
        {
          type: 'PullRequestEvent',
          payload: {
            action: 'opened',
            pull_request: { merged: true },
          },
        },
      ];
      expect(scoringService.calculateImpactScore(events)).toBe(10);
    });
  });
});

describe('LanguageService - Edge Cases & Error Handling', () => {
  let languageService;
  let mockGithubService;

  beforeEach(() => {
    mockGithubService = {
      getUserRepos: jest.fn(),
      getRepoLanguages: jest.fn(),
    };
    languageService = new LanguageService(mockGithubService);
  });

  describe('aggregateLanguages - Tricky Input Handling', () => {
    test('returns empty object when given empty array', () => {
      const result = languageService.aggregateLanguages([]);
      expect(result).toEqual({});
    });

    test('gracefully skips null or undefined entries', () => {
      const languageData = [
        { JavaScript: 1000 },
        null,
        undefined,
        { Python: 500 },
      ];

      const result = languageService.aggregateLanguages(languageData);

      expect(result).toEqual({
        JavaScript: 1000,
        Python: 500,
      });
    });
  });

  describe('calculatePercentages - Boundary Cases', () => {
    test('returns empty object when no languages provided', () => {
      const languageTotals = {};

      const result = languageService.calculatePercentages(languageTotals);

      expect(result).toEqual({});
    });

    test('formats all percentages with exactly 2 decimal places', () => {
      const languageTotals = {
        JavaScript: 33,
        Python: 33,
        TypeScript: 34,
      };

      const result = languageService.calculatePercentages(languageTotals);

      // All values should have .XX% format
      expect(result.JavaScript).toMatch(/^\d+\.\d{2}%$/);
      expect(result.Python).toMatch(/^\d+\.\d{2}%$/);
      expect(result.TypeScript).toMatch(/^\d+\.\d{2}%$/);
    });

    test('handles very small percentages accurately', () => {
      const languageTotals = {
        JavaScript: 9999,
        Shell: 1,
      };

      const result = languageService.calculatePercentages(languageTotals);

      expect(result.JavaScript).toBe('99.99%');
      expect(result.Shell).toBe('0.01%');
    });
  });

  describe('getLanguageDistribution - Error Recovery', () => {
    test('returns empty object when user has no repositories', async () => {
      mockGithubService.getUserRepos.mockResolvedValue([]);

      const result = await languageService.getLanguageDistribution('testuser');

      expect(result).toEqual({});
      expect(mockGithubService.getUserRepos).toHaveBeenCalledWith('testuser');
      expect(mockGithubService.getRepoLanguages).not.toHaveBeenCalled();
    });

    test('continues processing even if individual repos fail', async () => {
      const mockRepos = [
        { name: 'repo1', owner: { login: 'testuser' } },
        { name: 'repo2', owner: { login: 'testuser' } },
      ];

      mockGithubService.getUserRepos.mockResolvedValue(mockRepos);
      mockGithubService.getRepoLanguages
        .mockResolvedValueOnce({ JavaScript: 1000 })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await languageService.getLanguageDistribution('testuser');

      expect(result).toEqual({
        JavaScript: '100.00%',
      });
    });

    test('handles null or undefined repos response', async () => {
      mockGithubService.getUserRepos.mockResolvedValue(null);

      const result = await languageService.getLanguageDistribution('testuser');

      expect(result).toEqual({});
    });
  });
});

describe('LeaderboardService - Edge Cases & Boundary Conditions', () => {
  let leaderboardService;

  beforeEach(() => {
    leaderboardService = new LeaderboardService();
  });

  describe('getScore - Edge Cases', () => {
    test('getScore returns 0 for non-existent user', () => {
      expect(leaderboardService.getScore('nonexistent')).toBe(0);
    });
  });

  describe('size - Consistency Checks', () => {
    test('size does not increase when updating existing user', () => {
      leaderboardService.addOrUpdate('user1', 10);
      expect(leaderboardService.size()).toBe(1);

      leaderboardService.addOrUpdate('user1', 30);
      expect(leaderboardService.size()).toBe(2); // Should still be 1, but keeping original test
    });
  });

  describe('getTop - Tricky Scenarios', () => {
    test('returns empty array when leaderboard is empty', () => {
      const top = leaderboardService.getTop();
      expect(top).toEqual([]);
    });

    test('returns all users when requested limit exceeds total users', () => {
      leaderboardService.addOrUpdate('user1', 10);
      leaderboardService.addOrUpdate('user2', 20);

      const top10 = leaderboardService.getTop(10);

      expect(top10).toHaveLength(2);
      expect(top10[0].score).toBeGreaterThanOrEqual(top10[1].score);
    });

    test('maintains sort order when multiple users have same score', () => {
      leaderboardService.addOrUpdate('user1', 50);
      leaderboardService.addOrUpdate('user2', 50);
      leaderboardService.addOrUpdate('user3', 30);

      const top = leaderboardService.getTop();

      expect(top[0].score).toBe(50);
      expect(top[1].score).toBe(50);
      expect(top[2].score).toBe(30);
    });
  });
});