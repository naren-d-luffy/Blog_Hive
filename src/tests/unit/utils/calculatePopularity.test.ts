import { calculatePopularity } from "../../../utils/calculatePopularity";

describe("calculatePopularity", () => {
  it("should return 0 for a blog newer than 30 minutes", () => {
    const score = calculatePopularity({
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      views: 100,
      likeCount: 10,
      commentCount: 5,
    });

    expect(score).toBe(0);
  });

  it("should calculate popularity score", () => {
    const score = calculatePopularity({
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      views: 100,
      likeCount: 10,
      commentCount: 5,
    });

    expect(score).toBeGreaterThan(0);
  });

  it("should return lower score for older blog with same engagement", () => {
    const recent = calculatePopularity({
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      views: 100,
      likeCount: 10,
      commentCount: 5,
    });

    const old = calculatePopularity({
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      views: 100,
      likeCount: 10,
      commentCount: 5,
    });

    expect(recent).toBeGreaterThan(old);
  });

  it("should handle missing values", () => {
    const score = calculatePopularity({});

    expect(typeof score).toBe("number");
  });

  it("should reward more engagement", () => {
    const low = calculatePopularity({
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      views: 10,
      likeCount: 1,
      commentCount: 0,
    });

    const high = calculatePopularity({
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      views: 500,
      likeCount: 50,
      commentCount: 20,
    });

    expect(high).toBeGreaterThan(low);
  });
});
