const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide a coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: [true, 'Please specify a discount value'],
      min: [0, 'Discount value cannot be negative'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null, // Null indicates no limit
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if coupon is valid
couponSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  if (this.expiryDate && new Date() > this.expiryDate) return false;
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) return false;
  return true;
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
