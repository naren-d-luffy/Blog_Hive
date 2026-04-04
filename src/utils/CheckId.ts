import mongoose from "mongoose";
import AppError from "./AppError";

const checkId = (id: string): void => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Id", 400);
  }
};

export default checkId;
