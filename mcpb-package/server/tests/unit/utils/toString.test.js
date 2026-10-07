"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const toString_1 = require("../../../utils/toString");
describe("str", () => {
    it("should return string value", () => {
        expect((0, toString_1.str)("hello")).toBe("hello");
    });
    it("should return first string from array", () => {
        expect((0, toString_1.str)(["hello", "world"])).toBe("hello");
    });
    it("should return empty string for number", () => {
        expect((0, toString_1.str)(123)).toBe("");
    });
    it("should return empty string for object", () => {
        expect((0, toString_1.str)({})).toBe("");
    });
    it("should return empty string for empty array", () => {
        expect((0, toString_1.str)([])).toBe("");
    });
    it("should return empty string when first array element is not string", () => {
        expect((0, toString_1.str)([123, "abc"])).toBe("");
    });
    it("should return empty string for undefined", () => {
        expect((0, toString_1.str)(undefined)).toBe("");
    });
    it("should return empty string for null", () => {
        expect((0, toString_1.str)(null)).toBe("");
    });
});
