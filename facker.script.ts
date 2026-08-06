import fs from "fs";
import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";

// ─── Counts ──────────────────────────────────────────────────────────────────
const USERS = 100;
const BLOGS = 100;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Serialise an ObjectId as MongoDB Extended JSON so that mongoimport
 * creates a real ObjectId field instead of a plain string.
 *   { "$oid": "507f1f77bcf86cd799439011" }
 */
const oid = (id: ObjectId) => ({ $oid: id.toHexString() });

/**
 * Serialise a Date as MongoDB Extended JSON so that mongoimport
 * creates a real Date field instead of a plain ISO string.
 *   { "$date": "2024-01-15T10:30:00.000Z" }
 */
const dt = (date: Date) => ({ $date: date.toISOString() });

// ─── Users ───────────────────────────────────────────────────────────────────

const userIds: ObjectId[] = [];
const users: object[] = [];

for (let i = 0; i < USERS; i++) {
    const id = new ObjectId();
    userIds.push(id);

    users.push({
        _id:      oid(id),
        name:     faker.person.fullName(),
        email:    `user${i}@example.com`,
        // bcrypt hash of "Password1" (cost 10) — valid for login tests
        password: "$2b$10$V4J4E1Jq0vJQy5aQ8i8jQO6s0kYl7mTQj8kYl7mTQj8kYl7mTQj8K",
        role:     "user",
        status:   Math.random() > 0.1 ? "active" : "inactive",
        isVerified: Math.random() > 0.3,

        csrfToken:    null,
        refreshToken: null,

        isDeleted:  false,
        deletedDate: null,

        lastLogin:          dt(faker.date.recent()),
        failedLoginAttempt: faker.number.int({ min: 0, max: 2 }),
        lastPasswordChange: dt(faker.date.past()),
        lockUntil:          null,

        createdAt: dt(faker.date.past()),
        updatedAt: dt(faker.date.recent()),
    });
}

// ─── Blogs ───────────────────────────────────────────────────────────────────

const tags = [
    "node", "mongodb", "typescript", "react", "nestjs",
    "docker", "aws", "redis", "security", "backend",
];

const categories = [
    "Programming", "Database", "Cloud", "AI", "DevOps", "Tutorial", "News",
];

const blogs: object[] = [];

for (let i = 0; i < BLOGS; i++) {
    const authorId  = userIds[Math.floor(Math.random() * userIds.length)];
    const likeCount = faker.number.int({ min: 0, max: 1000 });

    blogs.push({
        _id:       oid(new ObjectId()),
        heading:   faker.lorem.sentence(),
        content:   faker.lorem.paragraphs(10),
        createdBy: oid(authorId),   // ← ObjectId reference, not a string
        updatedBy: oid(authorId),   // ← ObjectId reference, not a string

        tags:     faker.helpers.arrayElements(tags,       { min: 2, max: 5 }),
        category: faker.helpers.arrayElements(categories, { min: 1, max: 2 }),

        status: faker.helpers.arrayElement(["draft", "published", "archived"]),
        slug:   `blog-${i}-${new ObjectId().toHexString().slice(0, 6)}`, // unique slug

        views:    faker.number.int({ min: 0, max: 100_000 }),
        likes:    [],
        likeCount,

        comments:     [],
        commentCount: faker.number.int({ min: 0, max: 500 }),

        popularityScore:
            likeCount * 5 + faker.number.int({ min: 0, max: 5000 }),

        isDeleted:    false,
        deletedBy:    null,
        deletedByModel: null,
        deletedAt:    null,

        reportCount: faker.number.int({ min: 0, max: 20 }),

        createdAt: dt(faker.date.past()),
        updatedAt: dt(faker.date.recent()),
    });
}

// ─── Write ───────────────────────────────────────────────────────────────────

fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
fs.writeFileSync("blogs.json", JSON.stringify(blogs, null, 2));

console.log(`Done — ${users.length} users, ${blogs.length} blogs`);
console.log("Import with:");
console.log('  mongoimport --uri "<your-uri>" --collection users --file users.json --jsonArray');
console.log('  mongoimport --uri "<your-uri>" --collection blogs --file blogs.json --jsonArray');
