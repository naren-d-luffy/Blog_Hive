"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slug_1 = require("../../../utils/slug");
const blog_repository_1 = require("../../../modules/Blog/blog.repository");
jest.mock("../../../modules/Blog/blog.repository", () => ({
    blogRepository: {
        findBySlugByRegex: jest.fn(),
    },
}));
describe("generateSlug", () => {
    it("should convert title into slug", () => {
        expect((0, slug_1.generateSlug)("Hello World")).toBe("hello-world");
    });
    it("should remove special characters", () => {
        expect((0, slug_1.generateSlug)("Hello @ World!!!")).toBe("hello-world");
    });
    it("should trim whitespace", () => {
        expect((0, slug_1.generateSlug)("   Hello World   ")).toBe("hello-world");
    });
});
describe("generateUniqueSlug", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should return base slug when none exists", async () => {
        blog_repository_1.blogRepository.findBySlugByRegex.mockResolvedValue([]);
        const slug = await (0, slug_1.generateUniqueSlug)("Hello World");
        expect(slug).toBe("hello-world");
    });
    it("should append -1 when slug exists", async () => {
        blog_repository_1.blogRepository.findBySlugByRegex.mockResolvedValue([
            { slug: "hello-world" },
        ]);
        const slug = await (0, slug_1.generateUniqueSlug)("Hello World");
        expect(slug).toBe("hello-world-1");
    });
    it("should increment highest suffix", async () => {
        blog_repository_1.blogRepository.findBySlugByRegex.mockResolvedValue([
            { slug: "hello-world" },
            { slug: "hello-world-1" },
            { slug: "hello-world-5" },
            { slug: "hello-world-2" },
        ]);
        const slug = await (0, slug_1.generateUniqueSlug)("Hello World");
        expect(slug).toBe("hello-world-6");
    });
    it("should pass excludedId to repository", async () => {
        blog_repository_1.blogRepository.findBySlugByRegex.mockResolvedValue([]);
        await (0, slug_1.generateUniqueSlug)("Hello World", {
            excludedId: "123",
        });
        expect(blog_repository_1.blogRepository.findBySlugByRegex).toHaveBeenCalledWith(expect.any(RegExp), "123");
    });
});
