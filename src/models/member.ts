import { Schema, model, models } from "mongoose";

const memberSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    createdAt: { type: Date, default: Date.now },
    blocked: { type: Boolean, default: false },
    qrUuid: { type: String, required: true },
    emailValid: { type: Boolean, default: false },
    emailInvalid: { type: Boolean, default: false },
  },
  {
    collection: "members",
    autoIndex: false,
    versionKey: false,
  },
);

memberSchema.index({ email: 1 }, { unique: true });
memberSchema.index({ qrUuid: 1 }, { unique: true });

export const MemberModel = models.Member || model("Member", memberSchema);
