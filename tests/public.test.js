import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ScoringService } from '../src/services/scoring.service.js';
import { LanguageService } from '../src/services/language.service.js';
import { LeaderboardService } from '../src/services/leaderboard.service.js';

/**
 * Public API Tests
 *
 * These tests verify the standard, expected behavior of the public API.
 * Focus on happy paths, typical use cases, and main business logic.
 *
 * Scoring Rules:
 * - PushEvent: 1 point
 * - PullRequestEvent (opened): 5 points
 * - PullRequestEvent (merged): 10 points
 * - PullRequestReviewEvent: 3 points
 */

describe('ScoringService - Public API', () => {
  let scoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('calculateImpactScore - Standard Usage', () => {
    test('awards 1 point for a PushEvent', () => {
      const events = [{ type: 'PushEvent' }];
      expect(scoringService.calculateImpactScore(events)).toBe(1);
    });

    test('correctly sums points from multiple PushEvents', () => {
      const events = [
        { type: 'PushEvent' },
        { type: 'PushEvent' },
        { type: 'PushEvent' },
      ];
      expect(scoringService.calculateImpactScore(events)).toBe(3);
    });

    test('awards 5 points when pull request is opened', () => {
      const events = [
        {
          type: 'PullRequestEvent',
          payload: {
            action: 'opened',
            pull_request: { merged: false },
          },
        },
      ];
      expect(scoringService.calculateImpactScore(events)).toBe(5);
    });

    test('awards 10 points when pull request is merged', () => {
      const events = [
        {
          type: 'PullRequestEvent',
          payload: {
            pull_request: { merged: true },
          },
        },
      ];
      expect(scoringService.calculateImpactScore(events)).toBe(10);
    });

    test('awards 3 points for reviewing a pull request', () => {
      const events = [{ type: 'PullRequestReviewEvent' }];
      expect(scoringService.calculateImpactScore(events)).toBe(3);
    });

    test('correctly calculates total score from diverse event types', () => {
      const events = [
        { type: 'PushEvent' },
        { type: 'PushEvent' },
        {
          type: 'PullRequestEvent',
          payload: { action: 'opened', pull_request: { merged: false } },
        },
        { type: 'PullRequestReviewEvent' },
        {
          type: 'PullRequestEvent',
          payload: { pull_request: { merged: true } },
        },
      ];
      // 1 + 1 + 5 + 3 + 10 = 20
      expect(scoringService.calculateImpactScore(events)).toBe(20);
    });
  });
});

describe('LanguageService - Public API', () => {
  let languageService;
  let mockGithubService;

  beforeEach(() => {
    mockGithubService = {
      getUserRepos: jest.fn(),
      getRepoLanguages: jest.fn(),
    };
    languageService = new LanguageService(mockGithubService);
  });

  describe('aggregateLanguages - Standard Cases', () => {
    test('combines byte counts from multiple repositories', () => {
      const languageData = [
        { JavaScript: 1000, Python: 500 },
        { JavaScript: 2000, TypeScript: 1500 },
        { Python: 300 },
      ];

      const result = languageService.aggregateLanguages(languageData);

      expect(result).toEqual({
        JavaScript: 3000,
        Python: 800,
        TypeScript: 1500,
      });
    });

    test('handles single repository data correctly', () => {
      const languageData = [{ JavaScript: 1000, CSS: 200 }];

      const result = languageService.aggregateLanguages(languageData);

      expect(result).toEqual({
        JavaScript: 1000,
        CSS: 200,
      });
    });
  });

  describe('calculatePercentages - Standard Cases', () => {
    test('calculates correct percentages for multiple languages', () => {
      const languageTotals = {
        JavaScript: 7000,
        TypeScript: 3000,
      };

      const result = languageService.calculatePercentages(languageTotals);

      expect(result).toEqual({
        JavaScript: '70.00%',
        TypeScript: '30.00%',
      });
    });

    test('returns 100% for single language', () => {
      const languageTotals = { JavaScript: 1000 };

      const result = languageService.calculatePercentages(languageTotals);

      expect(result).toEqual({
        JavaScript: '100.00%',
      });
    });

    test('formats all percentages with exactly 2 decimal places', () => {
      const languageTotals = {
        JavaScript: 33,
        Python: 33,
        TypeScript: 34,
      };

      const result = languageService.calculatePercentages(languageTotals);

      expect(result).toEqual({
        JavaScript: '33.00%',
        Python: '33.00%',
        TypeScript: '34.00%',
      });
    });
  });

  describe('getLanguageDistribution - Standard Workflow', () => {
    test('fetches language data for all repositories and calculates distribution', async () => {
      const mockRepos = [
        { name: 'repo1', owner: { login: 'testuser' } },
        { name: 'repo2', owner: { login: 'testuser' } },
        { name: 'repo3', owner: { login: 'testuser' } },
      ];

      mockGithubService.getUserRepos.mockResolvedValue(mockRepos);
      mockGithubService.getRepoLanguages
        .mockResolvedValueOnce({ JavaScript: 1000 })
        .mockResolvedValueOnce({ Python: 500 })
        .mockResolvedValueOnce({ JavaScript: 500, TypeScript: 1000 });

      const result = await languageService.getLanguageDistribution('testuser');

      expect(mockGithubService.getRepoLanguages).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        JavaScript: '50.00%',
        Python: '16.67%',
        TypeScript: '33.33%',
      });
    });
  });
});

describe('LeaderboardService - Public API', () => {
  let leaderboardService;

  beforeEach(() => {
    leaderboardService = new LeaderboardService();
  });

  describe('Basic Operations', () => {
    test('addOrUpdate creates new entry and returns it', () => {
      const result = leaderboardService.addOrUpdate('octocat', 42);

      expect(result).toEqual({ username: 'octocat', score: 42 });
      expect(leaderboardService.getScore('octocat')).toBe(42);
    });

    test('addOrUpdate overwrites existing user score', () => {
      leaderboardService.addOrUpdate('octocat', 42);
      const result = leaderboardService.addOrUpdate('octocat', 100);

      expect(result).toEqual({ username: 'octocat', score: 100 });
      expect(leaderboardService.getScore('octocat')).toBe(100);
    });

    test('getScore retrieves stored score', () => {
      leaderboardService.addOrUpdate('octocat', 42);
      expect(leaderboardService.getScore('octocat')).toBe(42);
    });

    test('size returns correct number of users', () => {
      expect(leaderboardService.size()).toBe(0);

      leaderboardService.addOrUpdate('user1', 10);
      expect(leaderboardService.size()).toBe(1);

      leaderboardService.addOrUpdate('user2', 20);
      expect(leaderboardService.size()).toBe(2);
    });
  });

  describe('getTop - Standard Functionality', () => {
    test('returns users sorted by score in descending order', () => {
      leaderboardService.addOrUpdate('user1', 10);
      leaderboardService.addOrUpdate('user2', 50);
      leaderboardService.addOrUpdate('user3', 30);
      leaderboardService.addOrUpdate('user4', 40);

      const top3 = leaderboardService.getTop(3);

      expect(top3).toHaveLength(3);
      expect(top3[0]).toEqual({ username: 'user2', score: 50 });
      expect(top3[1]).toEqual({ username: 'user4', score: 40 });
      expect(top3[2]).toEqual({ username: 'user3', score: 30 });
    });

    test('uses default limit of 10 when no limit specified', () => {
      // Add 15 users
      for (let i = 1; i <= 15; i++) {
        leaderboardService.addOrUpdate(`user${i}`, i);
      }

      const top = leaderboardService.getTop();

      expect(top).toHaveLength(10);
      expect(top[0].score).toBe(15);
      expect(top[9].score).toBe(6);
    });
  });
});