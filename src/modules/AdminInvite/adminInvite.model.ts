import mongoose, { Schema } from "mongoose";
import { IAdminInvite } from "./adminInvite.interface";

const adminInviteSchema = new Schema<IAdminInvite>(
    {
        email: {type:String,lowercase:true, required:true, trim:true},
        tokenHash: { type: String, required: true, unique: true },
        expiryAt: {type:Date, required:true},
        invitedBy: {type:Schema.Types.ObjectId, ref:"Admin", required:true},
        isUsed: {type:Boolean, default:false}
    },{timestamps:true}
)

adminInviteSchema.index({email:1, isUsed:1});
adminInviteSchema.index({ expiryAt: 1 }, { expireAfterSeconds: 0 });

const AdminInvite = mongoose.model<IAdminInvite>("AdminInvite",adminInviteSchema);
export default AdminInvite;