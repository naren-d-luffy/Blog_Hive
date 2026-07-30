import AppError from "../../../utils/AppError";

describe("AppError", () => {
    it("should create an AppError with the correct properties", () => {
        const error = new AppError("Something went wrong", 400);

        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Something went wrong");
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
    });

    it("should store additional error details", () => {
        const details = {
            field: "email",
            reason: "Already exists",
        };

        const error = new AppError(
            "Validation failed",
            409,
            details
        );

        expect(error.details).toEqual(details);
    });

    it("should contain a stack trace", () => {
        const error = new AppError("Internal Server Error", 500);

        expect(error.stack).toBeDefined();
    });
});