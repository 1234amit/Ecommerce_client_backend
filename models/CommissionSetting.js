import mongoose from "mongoose";

const commissionSettingSchema = new mongoose.Schema(
  {
    retailCommissionPercent: {
      type: Number,
      default: 2,
    },
    bulkCommissionPercent: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const CommissionSetting = mongoose.model(
  "CommissionSetting",
  commissionSettingSchema
);

export default CommissionSetting;