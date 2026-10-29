import { generateSlug, generateUniqueSlug } from "../../../utils/slug";
import { blogRepository } from "../../../modules/Blog/blog.repository";

jest.mock("../../../modules/Blog/blog.repository", () => ({
  blogRepository: {
    findBySlugByRegex: jest.fn(),
  },
}));

describe("generateSlug", () => {
  it("should convert title into slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("should remove special characters", () => {
    expect(generateSlug("Hello @ World!!!")).toBe("hello-world");
  });

  it("should trim whitespace", () => {
    expect(generateSlug("   Hello World   ")).toBe("hello-world");
  });
});

describe("generateUniqueSlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return base slug when none exists", async () => {
    (blogRepository.findBySlugByRegex as jest.Mock).mockResolvedValue([]);

    const slug = await generateUniqueSlug("Hello World");

    expect(slug).toBe("hello-world");
  });

  it("should append -1 when slug exists", async () => {
    (blogRepository.findBySlugByRegex as jest.Mock).mockResolvedValue([
      { slug: "hello-world" },
    ]);

    const slug = await generateUniqueSlug("Hello World");

    expect(slug).toBe("hello-world-1");
  });

  it("should increment highest suffix", async () => {
    (blogRepository.findBySlugByRegex as jest.Mock).mockResolvedValue([
      { slug: "hello-world" },
      { slug: "hello-world-1" },
      { slug: "hello-world-5" },
      { slug: "hello-world-2" },
    ]);

    const slug = await generateUniqueSlug("Hello World");

    expect(slug).toBe("hello-world-6");
  });

  it("should pass excludedId to repository", async () => {
    (blogRepository.findBySlugByRegex as jest.Mock).mockResolvedValue([]);

    await generateUniqueSlug("Hello World", {
      excludedId: "123",
    });

    expect(blogRepository.findBySlugByRegex).toHaveBeenCalledWith(
      expect.any(RegExp),
      "123",
    );
  });
});
